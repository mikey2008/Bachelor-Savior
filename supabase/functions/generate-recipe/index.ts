// @ts-ignore: Deno module not found in standard Node TypeScript environments
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { prompt } = await req.json()
    // @ts-ignore: Deno global is not defined in standard TS
    const rawApiKey = Deno.env.get('GEMINI_API_KEY')
    const apiKey = rawApiKey ? rawApiKey.trim() : ''

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY not set in Supabase Secrets' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is missing in request body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call Gemini API - Simplified payload
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
      }
    )

    const responseText = await response.text()
    
    let data;
    try {
        data = JSON.parse(responseText)
    } catch (e) {
        throw new Error(`Invalid response from Gemini: ${responseText.slice(0, 100)}`)
    }

    if (!response.ok) {
      throw new Error(data.error?.message || `Failed to generate recipe (status ${response.status})`)
    }

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
