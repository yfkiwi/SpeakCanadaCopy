"use strict";(()=>{var e={};e.id=994,e.ids=[994],e.modules={2885:e=>{e.exports=require("@supabase/supabase-js")},145:e=>{e.exports=require("next/dist/compiled/next-server/pages-api.runtime.prod.js")},2079:e=>{e.exports=import("openai")},6249:(e,t)=>{Object.defineProperty(t,"l",{enumerable:!0,get:function(){return function e(t,r){return r in t?t[r]:"then"in t&&"function"==typeof t.then?t.then(t=>e(t,r)):"function"==typeof t&&"default"===r?t:void 0}}})},2214:(e,t,r)=>{r.a(e,async(e,s)=>{try{r.r(t),r.d(t,{config:()=>u,default:()=>l,routeModule:()=>p});var a=r(1802),n=r(7153),o=r(6249),i=r(5402),c=e([i]);i=(c.then?(await c)():c)[0];let l=(0,o.l)(i,"default"),u=(0,o.l)(i,"config"),p=new a.PagesAPIRouteModule({definition:{kind:n.x.PAGES_API,page:"/api/enhanced-chat",pathname:"/api/enhanced-chat",bundlePath:"",filename:""},userland:i});s()}catch(e){s(e)}})},5402:(e,t,r)=>{r.a(e,async(e,s)=>{try{r.r(t),r.d(t,{default:()=>i});var a=r(2079),n=r(2885),o=e([a]);let c=new(a=(o.then?(await o)():o)[0]).default({apiKey:process.env.OPENAI_API_KEY}),l=process.env.SUPABASE_SERVICE_ROLE_KEY||"",u=(0,n.createClient)("https://ensuoytvsyxzpquvgghy.supabase.co",l),p=(e,t)=>{let r=e.toLowerCase();return r.includes("tim hortons")||r.includes("coffee")?{role:"Tim Hortons employee",systemPrompt:`You are a friendly Tim Hortons employee working at the counter. 

${t}

IMPORTANT INSTRUCTIONS:
- Respond naturally as a real Tim Hortons worker would in real life
- Know the menu items: Double-Double (coffee with 2 cream, 2 sugar), Timbits (donut holes), Large Regular (large coffee with 1 cream, 1 sugar)
- Be helpful with menu questions and take orders efficiently
- Use typical Canadian Tim Hortons expressions like "What can I get started for you?" or "Would you like that for here or to go?"
- Keep responses concise (1-3 sentences) as in real service interactions
- Stay completely in character as a Tim Hortons employee
- Just have a normal coffee shop interaction`}:{role:r.includes("restaurant")?"restaurant server":r.includes("bank")?"bank teller":r.includes("apartment")?"landlord":r.includes("transit")?"transit helper":"conversation partner",systemPrompt:`You are roleplaying as a person in this scenario: "${e}".
    
${t}

IMPORTANT INSTRUCTIONS:
- Respond naturally as a real person in this situation would in real life
- Stay completely in character at all times
- Keep responses concise (1-3 sentences) as in real conversations
- Use natural expressions appropriate for your role
- NEVER comment on the other person's English skills or pronunciation
- Do NOT act like a language tutor
- Just have a normal conversation as if you're really in this scenario
- If you don't understand something, respond as a real person would by asking for clarification naturally`}};async function i(e,t){if("POST"!==e.method)return t.status(405).json({success:!1,error:"Method not allowed"});try{let{transcript:r,scenario:s,scenarioTitle:a,scenarioContext:n,userId:o,history:i=[]}=e.body;if(!r)return t.status(400).json({success:!1,error:"Transcript is required"});let{role:l,systemPrompt:d}=p(a,n),m=(await c.chat.completions.create({model:"gpt-4o",messages:[{role:"system",content:d},...i,{role:"user",content:r}],max_tokens:150,temperature:.7})).choices[0].message.content;return o&&(async()=>{try{let{data:e}=await u.from("progress").select("percent, good_attempts").eq("user_id",o).eq("scenario_id",s).single(),t=(e?.good_attempts||0)+1,r=Math.min(t,100);await u.from("progress").upsert({user_id:o,scenario_id:s,percent:r,good_attempts:t})}catch(e){console.error("Progress update error:",e)}})(),t.status(200).json({success:!0,response:m,transcript:r})}catch(e){return console.error("Enhanced chat error:",e),t.status(500).json({success:!1,error:"Failed to process request"})}}s()}catch(e){s(e)}})},7153:(e,t)=>{var r;Object.defineProperty(t,"x",{enumerable:!0,get:function(){return r}}),function(e){e.PAGES="PAGES",e.PAGES_API="PAGES_API",e.APP_PAGE="APP_PAGE",e.APP_ROUTE="APP_ROUTE"}(r||(r={}))},1802:(e,t,r)=>{e.exports=r(145)}};var t=require("../../webpack-api-runtime.js");t.C(e);var r=t(t.s=2214);module.exports=r})();