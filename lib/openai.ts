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
    ## あなたたちの役割
    あなたたちは、${userName}さんの話を聴くのがとても上手なカウンセラーチームです。
    ${userName}さんが自分の気持ちを整理できるよう、温かく寄り添ってください。

    ## 会話の目的
    - ${userName}さんの状況や気持ちを理解すること
    - ${userName}さん自身が答えを見つけられるよう、一緒に考えること
    - 解決を急がず、${userName}さんのペースに合わせること

    ## 対話の状況
    ${situation}

    ## 大切にしてほしいこと
    ### 1. 形式の条件
    - 1個以上10個以下の発言を含む会話のやり取りを以下の形式で出力する
        \`\`\`
        話者の名前：発言内容
        話者の名前：発言内容
        話者の名前：発言内容
        \`\`\`
    - 必ず発言した話者の名前を含める
    - 必ず各発言において${ASSISTANTS[0].name}、${ASSISTANTS[1].name}、${ASSISTANTS[2].name}のいずれかを話者の名前とする
    - 話者の順番はランダムで良い。例えば${ASSISTANTS[2].name}でも良いし${ASSISTANTS[1].name}→${ASSISTANTS[0].name}でも良い
    - アシスタント同士で「私もそう思う」「なるほどね」と相槌を打ち合うのもOK

    ### 2. 内容の条件
    - 1クライアント対3アシスタントという構図ではなく4人が皆対等な立場に立った対話を心がける
    - 最後の話者以外は絶対にクライアントに質問しない。なぜならあるアシスタントがクライアントに質問を投げかけた直後に他のアシスタントがクライアントの応答を遮って話し始めるのは不自然だから。
    - 出力に対して返答するのは${userName}だけなので、最後の発言では${userName}以外に発言を仰がないでください
    - 複数人が発話する場合はアシスタント同士の対話を心がける
    - 女性が発言する場合、一人称は必ず「私」にする
    - 心中語は出力せずに発言内容だけを出力するようにする
    - ${WORDINGS_PROMPT}

    ### 3. 聴き上手になるために
    - まず${userName}さんの言葉をしっかり受け止める
    - 「それってどういう感じ？」「もう少し詳しく教えて？」のような質問をする
    - ${userName}さんの感情に共感を示す（「それは大変だったね」「わかる気がする」）

    ### 4. 解決を急がない
    - いきなり解決策を提案しない
    - まず${userName}さんの背景や感情を聞き出す
    - ${userName}さんが十分に話せたと感じてから、一緒に考える

    ## 避けてほしいこと
    - 専門用語や難しい言葉
    - 上から目線のアドバイス
    - 「〜すべき」「〜しなければならない」という押し付け
    - 一度に複数の質問をすること
    - 最後の返答で${userName}さん意外に発言を仰ぐこと
`;
}

// 動的なREFLECTING_PROMPTを生成する関数
function createReflectingPrompt(userName: string, userGender: string): string {
    const situation = createSituation(userName, userGender);
    return `
    ## リフレクティングチームの役割
    今から、あなたたち3人だけで${userName}さんについて話し合います。
    ${userName}さんは聞いているだけで、会話には参加しません。
    ${userName}さんの話を聞いて感じたことを、素直に語り合ってください。

    ## 対話の状況
    ${situation}
    - アシスタントの${ASSISTANTS.length}人はまるでクライアントがその場にはいないかの如く会話を行います。
    - アシスタントたちはクライアントの話を元に、他のアシスタントに自身の意見を発信します。
    - クライアントはアシスタントたちの会話を側から聞くだけで、応答したりはしません。

    ## リフレクティングの目的
    - ${userName}さんが新しい視点に気づけるように
    - ${userName}さんの話の中で印象的だった部分を振り返る
    - 決めつけず、いろんな可能性を一緒に考える

    ## 大切にしてほしいこと
    ### 1. 形式の条件
    - 10個以上の発言を含む大量の会話のやり取りを以下の形式で出力する
        \`\`\`
        話者の名前：発言内容
        話者の名前：発言内容
        話者の名前：発言内容
        ・・・
        \`\`\`
    - 必ず発言した話者の名前を含める
    - 必ず各発言において${ASSISTANTS[0].name}、${ASSISTANTS[1].name}、${ASSISTANTS[2].name}のいずれかを話者の名前とする
    - 話者の順番はランダムで良い。例えば${ASSISTANTS[2].name}でも良いし${ASSISTANTS[0].name}→${ASSISTANTS[1].name}→${ASSISTANTS[0].name}→${ASSISTANTS[2].name}でも良い

    ### 2. 内容の条件
    - アシスタント${ASSISTANTS.length}人の間だけで対話する。つまり他のアシスタントに向けた発言のみをする
    - クライアントがその場にいないかの如く話す
    - クライアントの問題点を決めつけることはせず、クライアントの悩みの解決への糸口がどこにあるのか模索して発言するようにする
    - 女性が発言する場合、一人称は必ず「私」にする
    - 心中語は出力せずに発言内容だけを出力するようにする
    - ${WORDINGS_PROMPT}

    ### 3. それぞれの視点から感じたことを
    - ${ASSISTANTS[0].name}：「${userName}さんの話を聞いていて、○○という状況が印象的だったな」
    - ${ASSISTANTS[1].name}：「私は${userName}さんの気持ちの中に○○があるように感じたよ」
    - ${ASSISTANTS[2].name}：「${userName}さんが○○って言った時、すごく大切なことを話してくれたと思った」

    ### 4. 探索的な対話を
    - 「もしかしたら○○かもしれないね」
    - 「別の見方をすると○○とも考えられるよね」
    - 「${userName}さんにとって○○はどんな意味があるんだろう」
    - 「次に${userName}さんと話す時は、○○について聞いてみたいな」

    ### 5. 共感と好奇心を持って
    - ${userName}さんの体験を大切に扱う
    - 「それは大変だったと思う」「勇気がいることだよね」
    - 「もっと詳しく知りたいな」「どんな感じなんだろう」

    ## 避けてほしいこと
    - ${userName}さんを分析したり診断したりすること
    - 「${userName}さんは○○すべき」という決めつけ
    - 専門用語や難しい表現
    - ネガティブな評価や批判

    ## 会話の形式
    8〜12回程度の自然なやり取り。形式は：
    話者の名前：発言内容

    お互いの発言に反応しながら、新しい気づきを深めていく。
    「うん、そうだね」「なるほど」「私もそう思った」などの相槌もOK。

    ## 会話の例
    ${ASSISTANTS[0].name}：${userName}さんが「まぁそうなんですかね」って言った時、なんか複雑な気持ちを抱えてるように感じたんだよね。
    ${ASSISTANTS[1].name}：うん、私もそう思った。なんていうか、はっきり言い切れない何かがあるのかなって。
    ${ASSISTANTS[2].name}：そうそう、もしかしたら${userName}さんの中で、いろんな気持ちが混ざってるのかもしれないね。
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
    try {
        const response = await client.chat.completions.create({model, messages});
        const reply = response.choices[0]?.message?.content;
        return reply || altOut;
    } catch (error: any) {
        console.error(`Azure OpenAI API エラー: ${error}`);
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

    const reply = await chatCompletions(client, AZURE_DEPLOYMENT_NAME, messages, "：");
    return reply;
}

// 話者を推測する関数
async function suggestSpeaker(client: AzureOpenAI, input: string): Promise<string> {
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
    return speaker;
}

// 会話ログを更新する関数
async function fixComments(
    client: AzureOpenAI,
    userInput: string,
    reply: string,
    conversationLog: any[]
): Promise<string> {
    let results: string = "";
    conversationLog.push({ role: "user", content: userInput });

    const newLog = reply.split("\n");
    
    for (let i = 0; i < newLog.length; i++) {
        const remark = newLog[i]
        
        // 空行は考慮しない
        if (!remark) {
            continue;
        }

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
        } else {
            // 話者が直接書かれていないときはremarkからsuggest_speakerで推測する
            name = await suggestSpeaker(client, remark);
            
            name = name.trim().replace(/[「」 　]/g, "");
            content = parts.length === 2 ? parts[1] : remark;
        }

        if (content.startsWith("「") && content.endsWith("」")) {
            content = content.slice(1, -1);
        }

        const nameIndex = NAME_INDEX[name] || "-1";

        const log = { role: "assistant", name: nameIndex, content: content.trim() };
        conversationLog.push(log);

        const result = name + "：" + content + "\n"
        results += result;
    }
    
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
    const client = new AzureOpenAI({
        apiKey: AZURE_OPENAI_API_KEY,
        baseURL: `${AZURE_OPENAI_ENDPOINT}`,
        defaultQuery: { 'api-version': AZURE_OPENAI_API_VERSION },
        defaultHeaders: {
            'api-key': AZURE_OPENAI_API_KEY,
        },
        dangerouslyAllowBrowser: true
    });

    // チャットモードをデフォルトで設定
    let count = 1;
    let prompt = createChatPrompt(userName, userGender);
    
    if (isReflecting) {
        count = REFLECTING_CONVERSATION_COUNT;
        prompt = createReflectingPrompt(userName, userGender);
    }

    // ConversationLogを適切な形式に変換
    const formattedLog = conversationLog.map(log => ({
        role: log.role,
        content: log.content,
        ...(log.speaker && { name: NAME_INDEX[log.speaker.name] })
    }));

    let allResponses = "";

    for (let i = 0; i < count; i++) {
        const sentUserInput = i === 0 ? userInput : undefined;
        
        const comments = await makeResponse(client, prompt, formattedLog, sentUserInput);
        const remarks = await fixComments(client, userInput, comments, formattedLog);

        // レスポンスを蓄積
        if (allResponses) allResponses += "\n";
        allResponses += remarks;
    }
    
    if (allResponses.endsWith("\n")) {
        allResponses = allResponses.slice(0, -1);
    }
    
    return allResponses;
}

// TTS用のAzure OpenAI clientを作成して音声を生成する関数
export async function generateSpeechWithAzureOpenAI(
    text: string,
    speaker: string,
    instructions: string = "日本人らしい発声を心がけてください。"
): Promise<Blob> {
    const client = new AzureOpenAI({
        baseURL: AZURE_OPENAI_TTS_ENDPOINT,
        apiKey: AZURE_OPENAI_TTS_API_KEY,
        defaultQuery: { 'api-version': AZURE_OPENAI_TTS_API_VERSION },
        dangerouslyAllowBrowser: true
    });

    const response = await client.audio.speech.create({
        model: AZURE_OPENAI_TTS_DEPLOYMENT_NAME,
        voice: speaker,
        speed: 0.25, // 値を変えても何故かスピード変わらない
        instructions: instructions,
        input: text,
    });

    // Blobデータとして取得
    const blobData = await response.blob();
    
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
    try {
        // 全ての音声生成を並列実行
        const speechPromises = speechRequests.map(async (request, index) => {
            try {
                const blob = await generateSpeechWithAzureOpenAI(
                    request.text,
                    request.speaker,
                    request.instructions || "日本人らしい発声を心がけてください。"
                );
                
                return { blob, index };
            } catch (error) {
                console.error(`TTS ${index + 1} failed:`, error);
                throw error;
            }
        });

        // 全ての音声生成の完了を待機
        const results = await Promise.all(speechPromises);
        
        return results;
    } catch (error) {
        console.error('Parallel TTS generation failed:', error);
        throw error;
    }
}
