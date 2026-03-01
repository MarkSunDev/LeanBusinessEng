import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(request: Request) {
  try {
    const { prompt, userAnswer, apiBaseURL, apiKey, model, systemPrompt } =
      await request.json();

    if (!prompt || !userAnswer?.trim()) {
      return NextResponse.json(
        { error: "题目和回答不能为空" },
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
        {
          role: "user",
          content: `${prompt}\n\n学生的回答："${userAnswer}"`,
        },
      ],
      temperature: 0.3,
    });

    let raw = completion.choices[0]?.message?.content ?? "{}";
    // Strip markdown code fences if present
    raw = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
    const data = JSON.parse(raw);

    return NextResponse.json({
      isCorrect: data.isCorrect ?? false,
      message: data.message ?? "无法评估，请重试。",
    });
  } catch (error) {
    console.error("Evaluate API error:", error);
    const message =
      error instanceof Error ? error.message : "AI 评估失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
