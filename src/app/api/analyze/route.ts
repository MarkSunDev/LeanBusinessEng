import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  try {
    const { content, apiBaseURL, apiKey, model, systemPrompt } =
      await request.json();

    if (!content?.trim()) {
      return NextResponse.json(
        { error: "内容不能为空" },
        { status: 400 }
      );
    }

    if (!apiKey || !apiBaseURL) {
      return NextResponse.json(
        { error: "请先在设置中配置 API 地址和密钥" },
        { status: 400 }
      );
    }

    const openai = new OpenAI({
      apiKey,
      baseURL: apiBaseURL,
    });

    const completion = await openai.chat.completions.create({
      model: model || "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content },
      ],
      temperature: 0.3,
    });

    let raw = completion.choices[0]?.message?.content ?? "{}";
    // Strip markdown code fences if present
    raw = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");

    console.log("AI raw response:", raw.substring(0, 500));

    const data = JSON.parse(raw);

    console.log("AI parsed data:", {
      hasParsedHtml: !!data.parsedHtml,
      sentencesCount: data.sentences?.length || 0,
      vocabulariesCount: data.vocabularies?.length || 0,
      patternsCount: data.patterns?.length || 0,
      hasStudyPlan: !!data.studyPlan,
    });

    return NextResponse.json({
      parsedHtml: data.parsedHtml || content,
      sentences: data.sentences || [],
      vocabularies: data.vocabularies || [],
      patterns: data.patterns || [],
      studyPlan: data.studyPlan || null,
    });
  } catch (error) {
    console.error("Analyze API error:", error);
    const message =
      error instanceof Error ? error.message : "AI 解析失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
