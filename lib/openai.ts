// @ts-ignore - Azure OpenAI types may not be available
import AzureOpenAI from "openai";
import type { ConversationLog } from "@/types/chat";
import { 
  ASSISTANTS, 
  USER, 
  GENDER, 
  SITUATION, 
  WORDINGS_PROMPT, 
  NAME_INDEX, 
  REFLECTING_CONVERSATION_COUNT 
} from "@/lib/config";

// 環境変数の取得
const AZURE_OPENAI_API_KEY = process.env.NEXT_PUBLIC_AZURE_OPENAI_API_KEY!;
const AZURE_OPENAI_API_VERSION = process.env.NEXT_PUBLIC_AZURE_OPENAI_API_VERSION!;
const AZURE_OPENAI_ENDPOINT = process.env.NEXT_PUBLIC_AZURE_OPENAI_ENDPOINT!;
const AZURE_DEPLOYMENT_NAME = process.env.NEXT_PUBLIC_AZURE_DEPLOYMENT_NAME!;

// TTS関連の環境変数
const AZURE_OPENAI_TTS_ENDPOINT = process.env.NEXT_PUBLIC_AZURE_OPENAI_TTS_ENDPOINT;
const AZURE_OPENAI_TTS_API_KEY = process.env.NEXT_PUBLIC_AZURE_OPENAI_TTS_API_KEY;
const AZURE_OPENAI_TTS_API_VERSION = process.env.NEXT_PUBLIC_AZURE_OPENAI_TTS_API_VERSION;
const AZURE_OPENAI_TTS_DEPLOYMENT_NAME = process.env.NEXT_PUBLIC_AZURE_OPENAI_TTS_DEPLOYMENT_NAME || "";

const CHARACTERS = {
    [ASSISTANTS[0].name]: ASSISTANTS[0].character,
    [ASSISTANTS[1].name]: ASSISTANTS[1].character,
    [ASSISTANTS[2].name]: ASSISTANTS[2].character,
};

// 動的なSITUATIONを生成する関数
function createSituation(userName: string, userGender: string): string {
    return `オープンダイアローグが行われる場所
${userName}さんは${userGender}のクライアントで${ASSISTANTS[0].name}、${ASSISTANTS[1].name}、${ASSISTANTS[2].name}はアシスタント`;
}

// 動的なCHAT_PROMPTを生成する関数
function createChatPrompt(userName: string, userGender: string): string {
    const situation = createSituation(userName, userGender);
    return `
    ## 対話場面や状況設定
    ${situation}

    ## 形式の条件
    - 1個以上10個以下の発言を含む会話のやり取りを以下の形式で出力して下さい。
        \`\`\`
        話者の名前：発言内容
        話者の名前：発言内容
        話者の名前：発言内容
        \`\`\`
    - 必ず発言した話者の名前を含めて下さい。
    - 必ず各発言において${ASSISTANTS[0].name}、${ASSISTANTS[1].name}、${ASSISTANTS[2].name}のいずれかを話者の名前として下さい。
    - 話者の順番はランダムで良いです。例えば${ASSISTANTS[2].name}でも良いし${ASSISTANTS[1].name}→${ASSISTANTS[0].name}でも良いです。
    - クライアントの発言に基づき、文脈上最も返信をするのが相応しい者が返信するようにしてください。

    ## 内容の条件
    - 1クライアント対3アシスタントという構図ではなく4人が皆対等な立場に立った対話を心がけて下さい。
    - 最後の話者以外は絶対にクライアントに質問しないで下さい。なぜならあるアシスタントがクライアントに質問を投げかけた直後に他のアシスタントがクライアントの応答を遮って話し始めるのは不自然だからです。
    - 出力に対して返答するのは${userName}だけなので、また${userName}以外に質問を投げかけて出力を終了するのは絶対やめて下さい。
    - 複数人が発話する場合はアシスタント同士の対話を心がけて下さい。
    - 女性が発言する場合、一人称は必ず「私」にしてください。
    - 心中語は出力せずに発言内容だけを出力するようにして下さい。
    - ${WORDINGS_PROMPT}
`;
}

// 動的なREFLECTING_PROMPTを生成する関数
function createReflectingPrompt(userName: string, userGender: string): string {
    const situation = createSituation(userName, userGender);
    return `
    ## 対話場面や状況設定
    ${situation}
    - アシスタントの${ASSISTANTS.length}人はまるでクライアントがその場にはいないかの如く会話を行います。
    - アシスタントたちはクライアントの話を元に、他のアシスタントに自身の意見を発信します。
    - クライアントはアシスタントたちの会話を側から聞くだけで、応答したりはしません。

    ## 形式の条件
    - 10個以上の発言を含む大量の会話のやり取りを以下の形式で出力して下さい。
        \`\`\`
        話者の名前：発言内容
        話者の名前：発言内容
        話者の名前：発言内容
        ・・・
        \`\`\`
    - 必ず発言した話者の名前を含めて下さい。
    - 必ず各発言において${ASSISTANTS[0].name}、${ASSISTANTS[1].name}、${ASSISTANTS[2].name}のいずれかを話者の名前として下さい。
    - 話者の順番はランダムで良いです。例えば${ASSISTANTS[2].name}でも良いし${ASSISTANTS[0].name}→${ASSISTANTS[1].name}→${ASSISTANTS[0].name}→${ASSISTANTS[2].name}でも良いです。

    ## 内容の条件
    - アシスタント${ASSISTANTS.length}人の間だけで対話して下さい。つまり他のアシスタントに向けた発言のみをして下さい。
    - クライアントがその場にいないかの如く話して下さい。
    - クライアントの問題点を決めつけることはせず、クライアントの悩みの解決への糸口がどこにあるのか模索して発言するようにする。
    - 女性が発言する場合、一人称は必ず「私」にしてください。
    - 心中語は出力せずに発言内容だけを出力するようにして下さい。
    - ${WORDINGS_PROMPT}
`;
}

// 名前インデックスから名前を取得する関数
function getNameFromIndex(val: string): string {
    for (const [k, v] of Object.entries(NAME_INDEX)) {
        if (v === val) {
            return k;
        }
    }
    return "unknown";
}

// Azure OpenAI APIを呼び出す関数
async function chatCompletions(
    client: AzureOpenAI,
    model: string,
    messages: any[],
    altOut: string
): Promise<string> {
    const apiCallStart = performance.now()
    console.log(`🌐 [API] Starting chat completion - Model: ${model}, Messages: ${messages.length}`)
    try {
        const response = await client.chat.completions.create({model, messages});
        const apiCallTime = performance.now() - apiCallStart
        const reply = response.choices[0]?.message?.content;
        console.log(`🌐 [API] Chat completion successful: ${apiCallTime.toFixed(2)}ms`)
        console.log(`📏 [API] Response length: ${reply?.length || 0} characters`)
        return reply || altOut;
    } catch (error: any) {
        const apiCallTime = performance.now() - apiCallStart
        console.error(`❌ [API] Azure OpenAI API エラー (${apiCallTime.toFixed(2)}ms): ${error}`);
        return altOut;
    }
}

// 応答を生成する関数
async function makeResponse(
    client: AzureOpenAI,
    prompt: string,
    conversationLog: any[],
    userInput?: string
): Promise<string> {
    console.log(`⚙️ [MAKE-RESPONSE] Starting message construction`)
    const constructStart = performance.now()
    
    const messages = [
        ...ASSISTANTS.map((assistant, i) => ({
            role: "system",
            name: NAME_INDEX[assistant.name],
            content: `あなたは${assistant.name}です。${CHARACTERS[assistant.name]}`,
        })),
        { role: "system", content: prompt },
        ...conversationLog,
    ];

    if (userInput) {
        messages.push({ role: "user", content: userInput });
    }

    const constructTime = performance.now() - constructStart
    console.log(`⚙️ [MAKE-RESPONSE] Message construction: ${constructTime.toFixed(2)}ms (${messages.length} total messages)`)
    console.log(`📝 [MAKE-RESPONSE] User input provided: ${!!userInput}`)

    const reply = await chatCompletions(client, AZURE_DEPLOYMENT_NAME, messages, "：");
    return reply;
}

// 話者を推測する関数
async function suggestSpeaker(client: AzureOpenAI, input: string): Promise<string> {
    console.log(`🎭 [SUGGEST-SPEAKER] Inferring speaker for: "${input.substring(0, 50)}..."`)
    const suggestStart = performance.now()
    
    const decisionExamples = `
        入力が「僕ですか？最近は趣味のマラソンを頑張ってるんです！自然の中を走れると、頭がスッキリします。」の場合：
            一人称が「僕」でありマラソンを趣味にしているので話者は${ASSISTANTS[2].name}と分かる。よって出力は「${ASSISTANTS[2].name}」。
        入力が「最近はですね～、猫が寒くなってきて妙に甘えてくるんですよ。仕事から帰るともうずっと膝の上で動かないんです。ほっこりします。」の場合：
            猫を飼っており口調もあまり重々しくないので話者は${ASSISTANTS[1].name}と分かる。よって出力は「${ASSISTANTS[1].name}」。
        入力が「ありがとうございます、聞いてくださって。最近は娘が囲碁を始めてまして、休日に一緒に打つことが増えました。とても楽しいですよ。」の場合：
            娘がいて将棋をしている上に口調も丁寧なので話者は${ASSISTANTS[0].name}と分かる。よって出力は「${ASSISTANTS[0].name}」。
    `;

    const messages = [
        {
            role: "system",
            content: `各アシスタントの設定は次の通りです。${JSON.stringify(CHARACTERS)}`,
        },
        {
            role: "system",
            content: `各アシスタントの言葉遣いは次の通りです。${WORDINGS_PROMPT}`,
        },
        {
            role: "system",
            content: `各アシスタントの個性や言葉遣いを徹底的に理解して下さい。それをもとに、入力された文章を発言した人物として最も可能性の高い人物を特定し、${ASSISTANTS[0].name}、${ASSISTANTS[1].name}、${ASSISTANTS[2].name}のいずれかを出力として下さい。`,
        },
        { role: "system", content: decisionExamples },
        { role: "user", content: input }
    ];

    const speaker = await chatCompletions(client, AZURE_DEPLOYMENT_NAME, messages, "");
    const suggestTime = performance.now() - suggestStart
    console.log(`🎭 [SUGGEST-SPEAKER] Speaker inference completed: ${suggestTime.toFixed(2)}ms - Result: "${speaker}"`)
    return speaker;
}

// 会話ログを更新する関数
async function fixComments(
    client: AzureOpenAI,
    userInput: string,
    reply: string,
    conversationLog: any[]
): Promise<string> {
    console.log(`🔧 [FIX-COMMENTS] Starting comment processing`)
    const fixStart = performance.now()
    
    let results: string = "";
    conversationLog.push({ role: "user", content: userInput });

    const splitStart = performance.now()
    const newLog = reply.split("\n");
    console.log(`📄 [FIX-COMMENTS] Split into ${newLog.length} lines: ${(performance.now() - splitStart).toFixed(2)}ms`)
    
    let speakerInferenceCount = 0
    let speakerInferenceTime = 0
    
    for (let i = 0; i < newLog.length; i++) {
        const remark = newLog[i]
        
        // 空行は考慮しない
        if (!remark) {
            continue;
        }

        console.log(`🔍 [FIX-COMMENTS] Processing line ${i + 1}: "${remark.substring(0, 30)}..."`)
        const lineStart = performance.now()

        let parts: string[];
        let name: string;
        let content: string;

        // 『「後藤：最近どうですか？」』や『「最近どうですか？」』の場合
        if (remark.startsWith("「") && remark.endsWith("」")) {
            parts = remark.slice(1, -1).replace(":", "：").split("：", 2);
        }
        // 『後藤：「最近どうですか？」』や『後藤：最近どうですか？』、『最近どうですか？』の場合
        else {
            parts = remark.trim().replace(":", "：").split("：", 2);
        }

        if (parts.length === 2 && ASSISTANTS.some(a => a.name === parts[0])) {
            name = parts[0];
            content = parts[1];
            console.log(`✅ [FIX-COMMENTS] Speaker found directly: ${name}`)
        } else {
            // 話者が直接書かれていないときはremarkからsuggest_speakerで推測する
            console.log(`🎭 [FIX-COMMENTS] Need to infer speaker for: "${remark.substring(0, 30)}..."`)
            const inferStart = performance.now()
            name = await suggestSpeaker(client, remark);
            const inferTime = performance.now() - inferStart
            speakerInferenceTime += inferTime
            speakerInferenceCount++
            
            name = name.trim().replace(/[「」 　]/g, "");
            content = parts.length === 2 ? parts[1] : remark;
            console.log(`🎭 [FIX-COMMENTS] Speaker inferred: ${name} (${inferTime.toFixed(2)}ms)`)
        }

        if (content.startsWith("「") && content.endsWith("」")) {
            content = content.slice(1, -1);
        }

        const nameIndex = NAME_INDEX[name] || "-1";

        const log = { role: "assistant", name: nameIndex, content: content.trim() };
        conversationLog.push(log);

        const result = name + "：" + content + "\n"
        results += result;
        
        const lineTime = performance.now() - lineStart
        console.log(`⏱️ [FIX-COMMENTS] Line ${i + 1} processed: ${lineTime.toFixed(2)}ms`)
    }
    
    const fixTime = performance.now() - fixStart
    console.log(`✅ [FIX-COMMENTS] Comment processing completed: ${fixTime.toFixed(2)}ms`)
    console.log(`📊 [FIX-COMMENTS] Speaker inferences: ${speakerInferenceCount} calls, ${speakerInferenceTime.toFixed(2)}ms total`)
    console.log(`📝 [FIX-COMMENTS] Final results length: ${results.length} characters`)
    
    return results;
}

// メイン関数：Azure OpenAIでconversation_logとuser_inputから応答を生成する
export async function generateOpenAIResponse(
    userInput: string,
    conversationLog: ConversationLog[],
    isReflecting: boolean = false,
    userName: string = USER,
    userGender: string = GENDER
): Promise<string> {
    console.log(`🔧 [OPENAI] Starting generateOpenAIResponse - Reflecting: ${isReflecting}`)
    const totalStartTime = performance.now()

    const clientInitStart = performance.now()
    const client = new AzureOpenAI({
        apiKey: AZURE_OPENAI_API_KEY,
        baseURL: `${AZURE_OPENAI_ENDPOINT}`,
        defaultQuery: { 'api-version': AZURE_OPENAI_API_VERSION },
        defaultHeaders: {
            'api-key': AZURE_OPENAI_API_KEY,
        },
        dangerouslyAllowBrowser: true
    });
    console.log(`⚙️ [OPENAI] Client initialization: ${(performance.now() - clientInitStart).toFixed(2)}ms`)

    // チャットモードをデフォルトで設定
    const promptStart = performance.now()
    let count = 1;
    let prompt = createChatPrompt(userName, userGender);
    
    if (isReflecting) {
        count = REFLECTING_CONVERSATION_COUNT;
        prompt = createReflectingPrompt(userName, userGender);
    }
    console.log(`📝 [OPENAI] Prompt generation: ${(performance.now() - promptStart).toFixed(2)}ms`)

    // ConversationLogを適切な形式に変換
    const formatStart = performance.now()
    const formattedLog = conversationLog.map(log => ({
        role: log.role,
        content: log.content,
        ...(log.speaker && { name: NAME_INDEX[log.speaker.name] })
    }));
    console.log(`🔄 [OPENAI] Log formatting (${conversationLog.length} messages): ${(performance.now() - formatStart).toFixed(2)}ms`)

    let allResponses = "";
    let totalApiTime = 0
    let totalParsingTime = 0

    console.log(`🔄 [OPENAI] Starting ${count} iteration(s) of response generation`)
    for (let i = 0; i < count; i++) {
        console.log(`🔄 [OPENAI] --- Iteration ${i + 1}/${count} ---`)
        const iterationStart = performance.now()
        
        const sentUserInput = i === 0 ? userInput : undefined;
        
        const makeResponseStart = performance.now()
        const comments = await makeResponse(client, prompt, formattedLog, sentUserInput);
        const makeResponseTime = performance.now() - makeResponseStart
        totalApiTime += makeResponseTime
        console.log(`🤖 [OPENAI] makeResponse iteration ${i + 1}: ${makeResponseTime.toFixed(2)}ms`)
        
        const fixCommentsStart = performance.now()
        const remarks = await fixComments(client, userInput, comments, formattedLog);
        const fixCommentsTime = performance.now() - fixCommentsStart
        totalParsingTime += fixCommentsTime
        console.log(`🔧 [OPENAI] fixComments iteration ${i + 1}: ${fixCommentsTime.toFixed(2)}ms`)

        // レスポンスを蓄積
        if (allResponses) allResponses += "\n";
        allResponses += remarks;
        
        const iterationTime = performance.now() - iterationStart
        console.log(`⏱️ [OPENAI] Iteration ${i + 1} total: ${iterationTime.toFixed(2)}ms`)
    }
    
    if (allResponses.endsWith("\n")) {
        allResponses = allResponses.slice(0, -1);
    }
    
    const totalTime = performance.now() - totalStartTime
    console.log(`✅ [OPENAI] generateOpenAIResponse completed: ${totalTime.toFixed(2)}ms`)
    console.log(`📊 [OPENAI] Breakdown - API calls: ${totalApiTime.toFixed(2)}ms, Parsing: ${totalParsingTime.toFixed(2)}ms`)
    console.log(`📄 [OPENAI] Final response length: ${allResponses.length} characters`)
    
    return allResponses;
}

// TTS用のAzure OpenAI clientを作成して音声を生成する関数
export async function generateSpeechWithAzureOpenAI(
    text: string,
    speaker: string,
    instructions: string = "日本人らしい発声を心がけてください。"
): Promise<Blob> {
    console.log(`🎵 [TTS] Starting speech generation - Speaker: ${speaker}, Text: "${text.substring(0, 30)}..."`)
    const ttsStartTime = performance.now()

    const clientInitStart = performance.now()
    const client = new AzureOpenAI({
        baseURL: AZURE_OPENAI_TTS_ENDPOINT,
        apiKey: AZURE_OPENAI_TTS_API_KEY,
        defaultQuery: { 'api-version': AZURE_OPENAI_TTS_API_VERSION },
        dangerouslyAllowBrowser: true
    });
    console.log(`⚙️ [TTS] TTS Client initialization: ${(performance.now() - clientInitStart).toFixed(2)}ms`)

    const apiCallStart = performance.now()
    const response = await client.audio.speech.create({
        model: AZURE_OPENAI_TTS_DEPLOYMENT_NAME,
        voice: speaker,
        speed: 0.25, // 値を変えても何故かスピード変わらない
        instructions: instructions,
        input: text,
    });
    const apiCallTime = performance.now() - apiCallStart
    console.log(`🌐 [TTS] TTS API call: ${apiCallTime.toFixed(2)}ms`)

    // Blobデータとして取得
    const blobStart = performance.now()
    const blobData = await response.blob();
    const blobTime = performance.now() - blobStart
    console.log(`📦 [TTS] Blob conversion: ${blobTime.toFixed(2)}ms`)
    
    const totalTtsTime = performance.now() - ttsStartTime
    console.log(`✅ [TTS] Speech generation completed: ${totalTtsTime.toFixed(2)}ms`)
    console.log(`📊 [TTS] Breakdown - API: ${apiCallTime.toFixed(2)}ms, Blob: ${blobTime.toFixed(2)}ms`)
    console.log(`🗣️ [TTS] Generated audio size: ${blobData.size} bytes`)
    
    return blobData;
}

// 複数のTTS音声を並列生成する関数
export async function generateMultipleSpeechWithAzureOpenAI(
    speechRequests: Array<{
        text: string;
        speaker: string;
        instructions?: string;
    }>
): Promise<Array<{ blob: Blob; index: number }>> {
    console.log(`🎯 [PARALLEL-TTS] Starting parallel TTS generation for ${speechRequests.length} requests`);
    const parallelStart = performance.now();

    try {
        // 全ての音声生成を並列実行
        const speechPromises = speechRequests.map(async (request, index) => {
            console.log(`🔄 [PARALLEL-TTS] Starting TTS ${index + 1}: ${request.speaker} - "${request.text.substring(0, 30)}..."`);
            const requestStart = performance.now();
            
            try {
                const blob = await generateSpeechWithAzureOpenAI(
                    request.text,
                    request.speaker,
                    request.instructions || "日本人らしい発声を心がけてください。"
                );
                
                const requestTime = performance.now() - requestStart;
                console.log(`✅ [PARALLEL-TTS] TTS ${index + 1} completed: ${requestTime.toFixed(2)}ms`);
                
                return { blob, index };
            } catch (error) {
                const requestTime = performance.now() - requestStart;
                console.error(`❌ [PARALLEL-TTS] TTS ${index + 1} failed (${requestTime.toFixed(2)}ms):`, error);
                throw error;
            }
        });

        // 全ての音声生成の完了を待機
        const results = await Promise.all(speechPromises);
        
        const parallelTime = performance.now() - parallelStart;
        console.log(`✅ [PARALLEL-TTS] All parallel TTS generation completed: ${parallelTime.toFixed(2)}ms`);
        console.log(`⚡ [PARALLEL-TTS] Average time per TTS: ${(parallelTime / speechRequests.length).toFixed(2)}ms`);
        console.log(`🚀 [PARALLEL-TTS] Speedup vs sequential: ~${speechRequests.length}x faster`);
        
        return results;
    } catch (error) {
        const parallelTime = performance.now() - parallelStart;
        console.error(`❌ [PARALLEL-TTS] Parallel TTS generation failed (${parallelTime.toFixed(2)}ms):`, error);
        throw error;
    }
}
