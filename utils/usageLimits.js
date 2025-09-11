import { supabase } from '../lib/supabaseClient';

const PLAN_LIMITS = {
  free: { daily: 5, name: 'Free', price: 0 },
  basic: { daily: 80, name: 'Basic', price: 6.99 },
  plus: { daily: 200, name: 'Plus', price: 12.99 }
};

export async function getUserPlan(userId) {
  if (!userId) return { plan_type: 'free', expires_at: null };
  
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('plan_type, plan_expires_at')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user plan:', error);
      return { plan_type: 'free', expires_at: null };
    }
    
    const now = new Date();
    const expiresAt = data.plan_expires_at ? new Date(data.plan_expires_at) : null;
    
    if (expiresAt && now > expiresAt) {
      await supabase
        .from('user_profiles')
        .update({ plan_type: 'free', plan_expires_at: null })
        .eq('user_id', userId);
      
      return { plan_type: 'free', expires_at: null };
    }
    
    return {
      plan_type: data.plan_type || 'free',
      expires_at: expiresAt
    };
  } catch (error) {
    console.error('Error in getUserPlan:', error);
    return { plan_type: 'free', expires_at: null };
  }
}

export async function canRecord(userId) {
  if (!userId) return { canUse: false, error: 'No user ID' };
  
  try {
    const userPlan = await getUserPlan(userId);
    const planConfig = PLAN_LIMITS[userPlan.plan_type] || PLAN_LIMITS.free;
    
    const today = new Date().toISOString().split('T')[0];
    
    const { data, error } = await supabase
      .from('daily_usage_limits')
      .select('roleplay_count')
      .eq('user_id', userId)
      .eq('usage_date', today)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error checking usage:', error);
      return { canUse: false, error: error.message };
    }
    
    const currentUsage = data?.roleplay_count || 0;
    const dailyLimit = planConfig.daily;
    const canUse = currentUsage < dailyLimit;
    
    return {
      canUse,
      currentUsage,
      maxUsage: dailyLimit === 999 ? 'Unlimited' : dailyLimit,
      remaining: dailyLimit === 999 ? 'Unlimited' : Math.max(0, dailyLimit - currentUsage),
      planType: userPlan.plan_type,
      planName: planConfig.name,
      expiresAt: userPlan.expires_at
    };
  } catch (error) {
    console.error('Error in canRecord:', error);
    return { canUse: false, error: error.message };
  }
}

// Keep the old function for backward compatibility
export async function canUseRoleplay(userId) {
  return canRecord(userId);
}

export async function incrementRecordingUsage(userId) {
  if (!userId) return { success: false, error: 'No user ID' };
  
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const usageCheck = await canRecord(userId);
    if (!usageCheck.canUse) {
      return { success: false, error: 'Recording limit exceeded' };
    }
    
    const { data: existingData, error: selectError } = await supabase
      .from('daily_usage_limits')
      .select('roleplay_count')
      .eq('user_id', userId)
      .eq('usage_date', today)
      .single();
    
    if (selectError && selectError.code !== 'PGRST116') {
      return { success: false, error: selectError.message };
    }
    
    if (existingData) {
      const { error: updateError } = await supabase
        .from('daily_usage_limits')
        .update({ roleplay_count: existingData.roleplay_count + 1 })
        .eq('user_id', userId)
        .eq('usage_date', today);
      
      if (updateError) {
        return { success: false, error: updateError.message };
      }
    } else {
      const { error: insertError } = await supabase
        .from('daily_usage_limits')
        .insert({
          user_id: userId,
          usage_date: today,
          roleplay_count: 1
        });
      
      if (insertError) {
        return { success: false, error: insertError.message };
      }
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in incrementRecordingUsage:', error);
    return { success: false, error: error.message };
  }
}

// Keep the old function for backward compatibility
export async function incrementUsage(userId) {
  return incrementRecordingUsage(userId);
}