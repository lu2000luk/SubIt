"use client";
import { Dropzone } from "@/components/ui/dropzone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useRef, useState, useEffect } from "react";
import z, { set } from "zod";
import { ArrowLeft, ArrowRight, ExternalLink } from "lucide-react";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { DialogTrigger } from "@radix-ui/react-dialog";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";

export default function Home() {
	const commonPunctuation = [".", "!", "?"];
	const validLanguages = [
		{ value: "en", label: "English" },
		{ value: "zh", label: "Chinese" },
		{ value: "de", label: "German" },
		{ value: "es", label: "Spanish" },
		{ value: "ru", label: "Russian" },
		{ value: "ko", label: "Korean" },
		{ value: "fr", label: "French" },
		{ value: "ja", label: "Japanese" },
		{ value: "pt", label: "Portuguese" },
		{ value: "tr", label: "Turkish" },
		{ value: "pl", label: "Polish" },
		{ value: "ca", label: "Catalan" },
		{ value: "nl", label: "Dutch" },
		{ value: "ar", label: "Arabic" },
		{ value: "sv", label: "Swedish" },
		{ value: "it", label: "Italian" },
		{ value: "id", label: "Indonesian" },
		{ value: "hi", label: "Hindi" },
		{ value: "fi", label: "Finnish" },
		{ value: "vi", label: "Vietnamese" },
	];

	const [splitChars, setSplitChars] = useState<string[]>(commonPunctuation);
	const [maxSentenceLength, setMaxSentenceLength] = useState(5);
	const [maxSentenceTime, setMaxSentenceTime] = useState(5);
	const [timeTranslate, setTimeTranslate] = useState(0);
	const [splitCharsPreset, setSplitCharsPreset] =
		useState<string>("punctuation");
	const [language, setLanguage] = useState(validLanguages[0].value);
	const [langScrollPastMaxRight, setLangScrollPastMaxRight] = useState(true);
	const [langScrollPastMaxLeft, setLangScrollPastMaxLeft] = useState(false);

	const languageScrollerRef = useRef<HTMLDivElement>(null);
	const [isHoldingLeft, setIsHoldingLeft] = useState(false);
	const [isHoldingRight, setIsHoldingRight] = useState(false);

	const [apiKey, setApiKey] = useState("");
	
	useEffect(() => {
		const savedApiKey = localStorage.getItem("apiKey");
		if (savedApiKey) {
			setApiKey(savedApiKey);
		}
	}, []);

	useEffect(() => {
		if (apiKey) {
			localStorage.setItem("apiKey", apiKey);
		}
	}, [apiKey]);

	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isValidated, setIsValidated] = useState(false);

  	const [isTranscribing, setIsTranscribing] = useState(false);
	const [isDoneTranscribing, setIsDoneTranscribing] = useState(false);
	const [inputFileName, setInputFileName] = useState("");
	const [inputFile, setInputFile] = useState<File | null>(null);

	function alertError(message: string) {
		toast.error(message);
	}

	async function handleApiSubmit(e: React.FormEvent) {
		e.preventDefault();
		if (!apiKey.trim()) {
			alertError("API key is required");
			return;
		}
		setIsSubmitting(true);
		try {
			const response = await fetch(
				`/validate?key=${encodeURIComponent(apiKey)}`
			);
			if (response.ok) {
				setIsValidated(true);
        transcribe();
			} else {
				alertError("Invalid API key");
			}
		} catch (error) {
			alertError("Error validating API key");
		}
		setIsSubmitting(false);
	}

	useEffect(() => {
		if (!isHoldingLeft && !isHoldingRight) return;

		const interval = setInterval(() => {
			if (languageScrollerRef.current) {
				languageScrollerRef.current.scrollBy({
					left: isHoldingLeft ? -104 : 104,
					behavior: "smooth",
				});
			}
		}, 200);

		return () => clearInterval(interval);
	}, [isHoldingLeft, isHoldingRight]);

	const schema = z.object({
		input: z.any().refine((file) => {
			if (file instanceof File) {
				return true;
			}
			return false;
		}, "Invalid file"),
		maxSentenceLength: z.number().min(1).max(20).default(5),
		forceSplitWhen: z.array(z.string()).default(commonPunctuation),
		maxSentenceTime: z.number().min(1).max(20).default(5),
		timeTranslate: z.number().min(-5.0).max(5.0).default(0),
		language: z
			.enum([
				validLanguages[0].value,
				...validLanguages.slice(1).map((lang) => lang.value),
			])
			.default("en"),
	});

	if (isTranscribing) {
		return (
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 py-10 px-20 rounded-xl bg-[#1a5094] shadow-lg flex gap-4 flex-col items-center">
        <Spinner className="text-5xl" />
        <p className="text-xl font-mono">Transcribing...</p>
      </div>
		);
	}

	function generateUrl() {
		const params = {
			key: apiKey,
			lang: language,
			max_sentence_length: maxSentenceLength,
			max_sentence_time: maxSentenceTime,
			time_translate: timeTranslate,
			split_chars: btoa(JSON.stringify(splitChars)),
			filename: btoa(inputFileName),
		};

		const paramsArray = Object.entries(params);

		const queryString = paramsArray
			.map(
				([key, value]: [string, string | number]) =>
					`${key}=${encodeURIComponent(value)}`
			)
			.join("&");

		return `/transcribe?${queryString}`;
	}

  async function transcribe() {
      setIsTranscribing(true);
      const url = generateUrl();
      console.log(url);

	try {
		const response = await fetch(url, {
			method: 'POST',
			body: inputFile,
			headers: {
				'Content-Type': inputFile?.type || 'application/octet-stream'
			}
		});

		if (!response.ok) {
			throw new Error('Transcription failed');
		}

		const blob = await response.blob();
		const downloadUrl = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = downloadUrl;
		a.download = 'subit_'+inputFileName.split(".")[0]+'.vtt';
		a.click();
		URL.revokeObjectURL(downloadUrl);
	} catch (error) {
		alertError('Failed to transcribe file');
	} finally {
		setIsTranscribing(false);
		setIsDoneTranscribing(true);
	}
  }

	return (
		<>
			<div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-10 rounded-xl bg-[#1a5094] shadow-lg">
				<h1 className="text-3xl font-mono">Sub-it</h1>
				<div className="grid grid-cols-3 gap-4">
					<Dropzone
						accept={{
							".flac": [],
							".mp3": [],
							".wav": [],
							".ogg": [],
							".m4a": [],
							".mp4": [],
							".webm": [],
							".mpeg": [],
							".mpga": [],
						}}
						className="bg-black/40 hover:bg-black/60 text-white border-white mt-5 dropzone__input"
						idleMessage="Select a file to use as input"
						onDropAccepted={(files) => {
							setInputFile(files[0]);
							setInputFileName(files[0].name);
							setIsDoneTranscribing(false);
							setIsTranscribing(false);
						}}
						showFileList={false}
						onDropRejected={() => {
							alertError("Invalid file type");
						}}
						successMessage="File selected"
					/>
					<div className="options pt-5 col-span-2">
						<div className="option py-2 px-4 bg-black/40 rounded-md">
							<div className="flex justify-between items-center mb-1">
								<p className="text-md font-mono">Max sentence length</p>
								<p className="font-mono text-sm px-2 py-1 rounded-md bg-black/10">
									{maxSentenceLength} words
								</p>
							</div>
							<Slider
								defaultValue={[maxSentenceLength]}
								min={1}
								max={20}
								step={1}
								value={[maxSentenceLength]}
								onValueChange={(value) => {
									setMaxSentenceLength(value[0]);
								}}
								className="w-full mb-1"
								aria-label="Max sentence length"
							/>
						</div>

						<div className="option py-2 px-4 bg-black/40 rounded-md mt-2">
							<div className="flex justify-between items-center mb-1">
								<p className="text-md font-mono">Max sentence time</p>
								<p className="font-mono text-sm px-2 py-1 rounded-md bg-black/10">
									{maxSentenceTime} seconds
								</p>
							</div>
							<Slider
								defaultValue={[maxSentenceTime]}
								min={1}
								max={20}
								step={1}
								value={[maxSentenceTime]}
								onValueChange={(value) => {
									setMaxSentenceTime(value[0]);
								}}
								className="w-full mb-1"
								aria-label="Max sentence time"
							/>
						</div>

						<div className="option py-2 px-4 bg-black/40 rounded-md mt-2">
							<div className="flex justify-between items-center mb-1">
								<p className="text-md font-mono">Time offset</p>
								<p className="font-mono text-sm px-2 py-1 rounded-md bg-black/10">
									{timeTranslate} seconds
								</p>
							</div>
							<Slider
								defaultValue={[timeTranslate]}
								min={-5}
								max={5}
								step={0.1}
								value={[timeTranslate]}
								onValueChange={(value) => {
									setTimeTranslate(value[0]);
								}}
								className="w-full mb-1"
								aria-label="Time translate"
							/>
						</div>

						<div className="option py-2 px-4 bg-black/40 rounded-md mt-2">
							<div className="flex justify-between items-center mb-1">
								<p className="text-md font-mono">Force split when</p>
								<div
									className={
										"font-mono text-sm px-2 py-1 rounded-md bg-black/10" +
										(splitCharsPreset === "custom" ? " cursor-pointer" : "")
									}
									onClick={() => {
										if (splitCharsPreset === "custom") {
											setSplitChars(
												prompt(
													"Enter the characters to split by (space separated)",
													splitChars.join(" ")
												)?.split(" ") || []
											);
										}
									}}
								>
									{splitCharsPreset === "none" && "None"}
									{splitCharsPreset === "punctuation" &&
										commonPunctuation.join(" ")}
									{splitCharsPreset === "custom" && (
										<div className="flex items-center">
											<span>Edit</span>
											<ArrowRight className="w-4 h-4 ml-1" />
										</div>
									)}
								</div>
							</div>

							<div className="selectGroup grid grid-cols-3 gap-2 mb-1">
								<Button
									variant={splitCharsPreset === "none" ? "default" : "outline"}
									onClick={() => {
										setSplitCharsPreset("none");
										setSplitChars([]);
									}}
									className="w-full cursor-pointer"
								>
									None
								</Button>

								<Button
									variant={
										splitCharsPreset === "punctuation" ? "default" : "outline"
									}
									onClick={() => {
										setSplitCharsPreset("punctuation");
										setSplitChars(commonPunctuation);
									}}
									className="w-full cursor-pointer"
								>
									Punctuation
								</Button>

								<Button
									variant={
										splitCharsPreset === "custom" ? "default" : "outline"
									}
									onClick={() => {
										setSplitCharsPreset("custom");
										setSplitChars([]);
									}}
									className="w-full cursor-pointer"
								>
									Custom
								</Button>
							</div>
						</div>

						<div className="option py-2 px-4 bg-black/40 rounded-md mt-2">
							<div className="flex justify-between items-center mb-1">
								<p className="text-md font-mono">Language</p>
								<p className="font-mono text-sm px-2 py-1 rounded-md bg-black/10">
									{language}
								</p>
							</div>

							<div className="flex items-center gap-2">
								<div
									className="scrollLeft cursor-pointer rounded-full p-1 bg-black/20"
									onMouseDown={() => setIsHoldingLeft(true)}
									onMouseUp={() => setIsHoldingLeft(false)}
									onMouseLeave={() => setIsHoldingLeft(false)}
									onClick={() => {
										if (languageScrollerRef.current) {
											languageScrollerRef.current.scrollBy({
												left: -104,
												behavior: "smooth",
											});
										}
									}}
									style={{ display: langScrollPastMaxLeft ? "block" : "none" }}
								>
									<ArrowLeft className="w-4 h-4" />
								</div>
								<div
									ref={languageScrollerRef}
									onScroll={(e) => {
										e.currentTarget.scrollLeft > 0
											? setLangScrollPastMaxLeft(true)
											: setLangScrollPastMaxLeft(false);
										e.currentTarget.scrollLeft <
										e.currentTarget.scrollWidth - e.currentTarget.clientWidth
											? setLangScrollPastMaxRight(true)
											: setLangScrollPastMaxRight(false);
									}}
									className={
										"languages__scroller flex gap-2 overflow-x-auto scroll-smooth" +
										(langScrollPastMaxLeft ? " mask-l-from-80%" : "") +
										(langScrollPastMaxRight ? " mask-r-from-80%" : "")
									}
								>
									{validLanguages.map((lang) => (
										<Button
											variant={language === lang.value ? "default" : "outline"}
											onClick={() => {
												setLanguage(lang.value);
											}}
											key={lang.value}
											className="select-none cursor-pointer"
										>
											{lang.label}
										</Button>
									))}
								</div>

								<div
									className="scrollRight cursor-pointer rounded-full p-1 bg-black/20"
									onMouseDown={() => setIsHoldingRight(true)}
									onMouseUp={() => setIsHoldingRight(false)}
									onMouseLeave={() => setIsHoldingRight(false)}
									onClick={() => {
										if (languageScrollerRef.current) {
											languageScrollerRef.current.scrollBy({
												left: 104,
												behavior: "smooth",
											});
										}
									}}
									style={{ opacity: langScrollPastMaxRight ? 1 : 0 }}
								>
									<ArrowRight className="w-4 h-4" />
								</div>
							</div>
						</div>
					</div>
				</div>

				<Dialog>
					<DialogTrigger asChild>
						<Button
							onClick={(e) => {
								if (!inputFile) {
									e.preventDefault();
									alertError("File is missing");
								}
							}}
							className="mt-5 w-full flex items-center justify-between cursor-pointer font-mono select-none"
							variant={"secondary"}
						>
							Generate subtitles file <ArrowRight />
						</Button>
					</DialogTrigger>
					<DialogContent className="sm:max-w-[425px]">
						<DialogHeader>
							<DialogTitle>Set API key</DialogTitle>
							<DialogDescription className="flex items-center gap-1 text-white">
								To use the app get a <b>free</b> API key from{" "}
								<a
									href="https://console.groq.com/keys"
									className="flex gap-0.5 items-center text-blue-400"
								>
									<ExternalLink className="w-4 h-4" /> Groq
								</a>
							</DialogDescription>
						</DialogHeader>

						<form onSubmit={handleApiSubmit}>
							<div className="grid py-4">
								<Label htmlFor="api-key">API Key</Label>
								<Input
									id="api-key"
									placeholder="API Key"
									value={apiKey}
									onChange={(e) => setApiKey(e.target.value)}
								/>
							</div>

							<DialogFooter>
								<Button type="submit" disabled={isSubmitting}>
									{isSubmitting ? (
										"Validating..."
									) : (
										<>
											Transcribe <ArrowRight />
										</>
									)}
								</Button>
							</DialogFooter>
						</form>
					</DialogContent>
				</Dialog>
			</div>
		</>
	);
}
