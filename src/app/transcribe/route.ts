import { NextRequest } from "next/server";
import Groq from "groq-sdk";

interface TranscriptionResponse {
	task: string;
	language: string;
	duration: number;
	text: string;
	words: {
		word: string;
		start: number;
		end: number;
	}[];
	segments: null;
	x_groq: {
		id: string;
	};
}

export async function POST(req: NextRequest) {
	const { searchParams } = new URL(req.url);
	const file = await req.blob();

	const apiKey = decodeURIComponent(
		searchParams.get("key") || "Missing API Key"
	);
	const lang = decodeURIComponent(searchParams.get("lang") || "en");
	const max_sentence_length = decodeURIComponent(
		searchParams.get("max_sentence_length") || "5"
	);
	const max_sentence_time = decodeURIComponent(
		searchParams.get("max_sentence_time") || "5"
	);
	const time_translate = decodeURIComponent(
		searchParams.get("time_translate") || "0"
	);
	const split_chars = JSON.parse(
		atob(decodeURIComponent(searchParams.get("split_chars") || ""))
	) as string[];
	const filename = atob(
		decodeURIComponent(searchParams.get("filename") || "c3ViaXQud2F2")
	);

	const groq = new Groq({ apiKey });

	// @ts-ignore
	const transcription: TranscriptionResponse =
		await groq.audio.transcriptions.create({
			file: new File([file], "subit_" + filename, { type: file.type }),
			model: "whisper-large-v3-turbo",
			response_format: "verbose_json",
			timestamp_granularities: ["word"],
			temperature: 0.0,
			language: lang,
		});

	let final_srt = "";
    let current_srt_index = 0;

	function addToSrt(start: number, end: number, text: string) {
		const startTime = new Date(start * 1000 + parseFloat(time_translate) * 1000)
			.toISOString()
			.substr(11, 8)
			.replace(/\.\d+/, ",000");
		const endTime = new Date(end * 1000 + parseFloat(time_translate) * 1000)
			.toISOString()
			.substr(11, 8)
			.replace(/\.\d+/, ",000");
		final_srt += `${current_srt_index + 1}\n${startTime} --> ${endTime}\n${text}\n\n`;
		current_srt_index++;
	}

	let sentences: { text: string; start: number; end: number }[] = [];

	const maxWords = parseInt(max_sentence_length, 10);
	const maxTime = parseFloat(max_sentence_time);

	let currentSentence = "";
	let sentenceStart: number | null = null;
	let sentenceEnd = 0;
	let wordCount = 0;

	for (const word of transcription.words) {
		// Set the start time if this is the first word in a sentence.
		if (sentenceStart === null) {
			sentenceStart = word.start;
		}

		// Append the word to the current sentence.
		currentSentence += (wordCount > 0 ? " " : "") + word.word;
		wordCount++;
		sentenceEnd = word.end;

		// Check if the current word ends with a forced split character.
		const lastChar = word.word.slice(-1);
		const forceSplit = split_chars.includes(lastChar);

		// If any criterion is met, end the current sentence.
		if (
			forceSplit ||
			wordCount >= maxWords ||
			sentenceEnd - sentenceStart >= maxTime
		) {
			sentences.push({
				text: currentSentence,
				start: sentenceStart,
				end: sentenceEnd,
			});
			currentSentence = "";
			sentenceStart = null;
			wordCount = 0;
		}
	}

	// Flush any leftover words as a sentence.
	if (currentSentence && sentenceStart !== null) {
		sentences.push({
			text: currentSentence,
			start: sentenceStart,
			end: sentenceEnd,
		});
	}

	// Build the final SRT content.
	for (const sentence of sentences) {
		addToSrt(sentence.start, sentence.end, sentence.text);
	}

    return new Response(final_srt, {
        headers: {
            "Content-Type": "text/vtt",
            "Content-Disposition": `attachment; filename=subit_${filename}.vtt`,
            "Content-Length": final_srt.length.toString(),
        },
    });
}
