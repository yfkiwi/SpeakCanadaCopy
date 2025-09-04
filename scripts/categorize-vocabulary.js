// categorize-vocabulary.js - FULL VERSION
// Categorizes all vocabulary terms across all scenarios

import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const openai = new OpenAI({
    apiKey: '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'
});

const supabase = createClient(
    "https://ensuoytvsyxzpquvgghy.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuc3VveXR2c3l4enBxdXZnZ2h5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc5MzI3NCwiZXhwIjoyMDY2MzY5Mjc0fQ.NJyKgafZ95nqm8OqiDT4mESzkYvOXIltv6zBFRMuSUk"
);

// Define categories for each scenario
const scenarioCategories = {
    'Gym': [
        'Leg & glute',
        'Arm & shoulder',
        'Chest',
        'Back',
        'Core & abs',
        'Equipment',
        'Conversation'
    ],
    'Order Coffee': [
        'Coffee Types',
        'Food Items',
        'Coffee Terms',
        'Transaction'
    ],
    'Go Shopping': [
        'Groceries',
        'Clothing',
        'Electronics',
        'Shopping Terms',
        'Transaction'
    ],
    'Campus Directions': [
        'Buildings',
        'Locations',
        'Directions',
        'Landmarks'
    ]
};

// Configuration
const BATCH_SIZE = 20; // Process vocabulary in batches to avoid overwhelming the API
const ACTUALLY_UPDATE_DATABASE = true; // Set to true when ready to update the database
const API_DELAY_MS = 2000; // Delay between API calls to avoid rate limits (2 seconds)

async function categorizeVocabulary() {
    console.log('🚀 Starting AI categorization of all vocabulary...');

    // 1. Get all available scenarios from the database
    const { data: scenarioData, error: scenarioError } = await supabase
        .from('vocabulary_combined')
        .select('scenario')
        .is('category', null)
        .order('scenario');

    if (scenarioError) {
        console.error('❌ Error fetching scenarios:', scenarioError);
        return;
    }

    // Use a Set to get unique scenario values
    const uniqueScenarios = [...new Set(scenarioData.map(s => s.scenario))].filter(Boolean);
    const scenarioNames = uniqueScenarios;

    // Process each scenario
    for (const scenario of scenarioNames) {
        // Skip scenarios we don't have categories defined for
        if (!scenarioCategories[scenario]) {
            console.log(`⚠️ Skipping "${scenario}" - no categories defined`);
            continue;
        }

        console.log(`\n🔍 Processing scenario: "${scenario}"`);

        // 2. Count total uncategorized terms for this scenario
        const { count, error: countError } = await supabase
            .from('vocabulary_combined')
            .select('id', { count: 'exact', head: true })
            .eq('scenario', scenario)
            .is('category', null);

        if (countError) {
            console.error(`❌ Error counting terms for "${scenario}":`, countError);
            continue;
        }

        if (count === 0) {
            console.log(`ℹ️ No uncategorized terms found for "${scenario}"`);
            continue;
        }

        console.log(`📊 Found ${count} uncategorized terms for "${scenario}"`);

        // 3. Process in batches
        let processed = 0;
        while (processed < count) {
            console.log(`\n📦 Processing batch ${Math.floor(processed / BATCH_SIZE) + 1} (${processed} - ${Math.min(processed + BATCH_SIZE, count)})`);

            // Fetch the next batch of terms
            const { data: vocabulary, error } = await supabase
                .from('vocabulary_combined')
                .select('id, term, definition, scenario')
                .eq('scenario', scenario)
                .is('category', null)
                .range(processed, processed + BATCH_SIZE - 1)
                .order('id');

            if (error) {
                console.error(`❌ Error fetching terms for "${scenario}":`, error);
                break;
            }

            if (!vocabulary || vocabulary.length === 0) {
                console.log(`ℹ️ No more terms to process for "${scenario}"`);
                break;
            }

            // Create the prompt for this batch
            const categories = scenarioCategories[scenario];
            const termsText = vocabulary.map(term => `"${term.term}": ${term.definition}`).join('\n');
            const categoriesText = categories.map(cat => `- ${cat}`).join('\n');

            const prompt = `Categorize these "${scenario}" vocabulary terms into these categories:
${categoriesText}

Terms to categorize:
${termsText}

Return ONLY a JSON object where each key is the term and the value is the category name:
{"term1": "Category Name", "term2": "Category Name", ...}`;

            console.log(`🤖 Asking AI to categorize ${vocabulary.length} terms...`);

            try {
                // Call OpenAI
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o-mini",
                    messages: [
                        {
                            role: "system",
                            content: "You are a vocabulary categorization expert. Return only valid JSON with no additional text."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.3,
                });

                const responseText = completion.choices[0].message.content.trim();

                // Parse the response
                let categorizations;
                try {
                    categorizations = JSON.parse(responseText);
                    console.log(`✅ Successfully parsed AI response for ${Object.keys(categorizations).length} terms`);
                } catch (parseError) {
                    console.error('❌ Failed to parse AI response:', parseError);
                    console.log('Raw response:', responseText);
                    processed += vocabulary.length; // Skip this batch
                    continue;
                }

                // Show categorization results
                console.log('\n📋 Sample categorizations:');
                Object.entries(categorizations).slice(0, 5).forEach(([term, category]) => {
                    console.log(`  ✓ "${term}" → ${category}`);
                });

                if (Object.keys(categorizations).length > 5) {
                    console.log(`  ...and ${Object.keys(categorizations).length - 5} more`);
                }

                // Update the database if enabled
                if (ACTUALLY_UPDATE_DATABASE) {
                    const updates = [];
                    for (const term of vocabulary) {
                        const category = categorizations[term.term];
                        if (category) {
                            updates.push({
                                id: term.id,
                                category: category
                            });
                        }
                    }

                    if (updates.length > 0) {
                        console.log(`💾 Updating ${updates.length} terms in the database...`);

                        for (const update of updates) {
                            const { error: updateError } = await supabase
                                .from('vocabulary_combined')
                                .update({ category: update.category })
                                .eq('id', update.id);

                            if (updateError) {
                                console.error(`❌ Error updating term ID ${update.id}:`, updateError);
                            }
                        }
                        console.log(`🎉 Successfully updated ${updates.length} terms!`);
                    }
                } else {
                    console.log('⚠️ Database updates disabled - set ACTUALLY_UPDATE_DATABASE to true to save changes');
                }

            } catch (aiError) {
                console.error('❌ Error calling OpenAI:', aiError);
            }

            // Add delay between API calls to avoid rate limits
            if (processed + vocabulary.length < count) {
                console.log(`⏳ Waiting ${API_DELAY_MS / 1000}s before next API call...`);
                await new Promise(resolve => setTimeout(resolve, API_DELAY_MS));
            }

            processed += vocabulary.length;
            console.log(`📈 Progress: ${processed}/${count} terms (${Math.round(processed / count * 100)}%)`);
        }
    }

    console.log('\n✨ Categorization process complete!');
    if (!ACTUALLY_UPDATE_DATABASE) {
        console.log('⚠️ REMINDER: Database updates were NOT applied. Set ACTUALLY_UPDATE_DATABASE = true to save changes.');
    }
}

// Run the script
categorizeVocabulary().catch(error => {
    console.error('❌ Fatal error:', error);
});