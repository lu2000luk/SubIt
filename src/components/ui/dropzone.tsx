//@ts-nocheck
"use client";

import * as React from "react";
import {
	useDropzone,
	type DropzoneOptions,
	type FileRejection,
} from "react-dropzone";
import { cn } from "@/lib/utils";
import { Upload, File, AlertCircle, CheckCircle2, X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

// Update the dropzoneVariants to include cursor pointer on hover
const dropzoneVariants = cva(
	"relative flex flex-col items-center justify-center w-full rounded-lg border-2 border-dashed transition-colors duration-200 ease-in-out focus:outline-none cursor-pointer",
	{
		variants: {
			size: {
				default: "p-6",
				sm: "p-4",
				lg: "p-8",
			},
			variant: {
				default: "border-border bg-background hover:bg-accent/50",
				secondary: "border-secondary bg-secondary/10 hover:bg-secondary/20",
				destructive:
					"border-destructive bg-destructive/10 hover:bg-destructive/20",
			},
			state: {
				idle: "",
				dragging: "border-primary bg-primary/10",
				success: "border-success bg-success/10",
				error: "border-destructive bg-destructive/10",
				loading: "border-primary/50 bg-primary/5",
			},
		},
		defaultVariants: {
			size: "default",
			variant: "default",
			state: "idle",
		},
	}
);

// Update the DropzoneProps interface to include new props
export interface DropzoneProps
	extends React.HTMLAttributes<HTMLDivElement>,
		VariantProps<typeof dropzoneVariants>,
		Omit<DropzoneOptions, "className" | "style" | "multiple"> {
	/** Custom message to display when dropzone is idle */
	idleMessage?: React.ReactNode;
	/** Custom message to display when files are being dragged over the dropzone */
	dragMessage?: React.ReactNode;
	/** Custom message to display when files are successfully dropped */
	successMessage?: React.ReactNode;
	/** Custom message to display when there's an error */
	errorMessage?: React.ReactNode;
	/** Custom message to display when files are being uploaded */
	loadingMessage?: React.ReactNode;
	/** Whether to show file previews */
	showPreviews?: boolean;
	/** Maximum number of previews to show */
	maxPreviews?: number;
	/** Custom preview renderer */
	previewRenderer?: (file: File) => React.ReactNode;
	/** Whether to show the remove button on previews */
	showRemoveButton?: boolean;
	/** Custom icon for the dropzone */
	icon?: React.ReactNode;
	/** Custom success icon */
	successIcon?: React.ReactNode;
	/** Custom error icon */
	errorIcon?: React.ReactNode;
	/** Custom drag icon */
	dragIcon?: React.ReactNode;
	/** Custom loading icon */
	loadingIcon?: React.ReactNode;
	/** Whether to show the file list */
	showFileList?: boolean;
	/** Custom file list renderer */
	fileListRenderer?: (files: File[]) => React.ReactNode;
	/** Custom rejection list renderer */
	rejectionListRenderer?: (rejections: FileRejection[]) => React.ReactNode;
	/** Whether to allow multiple file uploads */
	multiple?: boolean;
	/** Minimum number of files required (only applies when multiple is true) */
	minFiles?: number;
	/** Maximum number of files allowed (only applies when multiple is true) */
	maxFiles?: number;
	/** Whether the component is in a loading state */
	isLoading?: boolean;
}

// Update the Dropzone component to handle the new props
const Dropzone = React.forwardRef<HTMLDivElement, DropzoneProps>(
	(
		{
			className,
			size,
			variant,
			state: stateProp,
			idleMessage = "Drag and drop files here, or click to select files",
			dragMessage = "Drop files here",
			successMessage = "Files uploaded successfully",
			errorMessage = "Error uploading files",
			loadingMessage = "Uploading files...",
			showPreviews = true,
			maxPreviews = 5,
			previewRenderer,
			showRemoveButton = true,
			icon = <Upload className="h-10 w-10 mb-4" />,
			successIcon = <CheckCircle2 className="h-10 w-10 text-success mb-4" />,
			errorIcon = <AlertCircle className="h-10 w-10 text-destructive mb-4" />,
			dragIcon = <Upload className="h-10 w-10 text-primary mb-4" />,
			loadingIcon = (
				<div className="h-10 w-10 mb-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
			),
			showFileList = true,
			fileListRenderer,
			rejectionListRenderer,
			multiple = true,
			minFiles = 0,
			maxFiles = Number.POSITIVE_INFINITY,
			isLoading = false,
			onDrop,
			onDropAccepted,
			onDropRejected,
			...props
		},
		ref
	) => {
		const [files, setFiles] = React.useState<File[]>([]);
		const [rejections, setRejections] = React.useState<FileRejection[]>([]);
		const [internalState, setInternalState] = React.useState<
			"idle" | "dragging" | "success" | "error" | "loading"
		>("idle");

		// Use the state prop if provided, otherwise use the internal state
		// If isLoading is true, override with loading state
		const state = isLoading ? "loading" : stateProp || internalState;

		const handleDrop = React.useCallback(
			(
				acceptedFiles: File[],
				fileRejections: FileRejection[],
				event: React.DragEvent<HTMLElement>
			) => {
				// For single file mode, only keep the last file
				const newFiles = multiple ? acceptedFiles : acceptedFiles.slice(-1);

				// Check if we have too few files
				if (multiple && minFiles > 0 && newFiles.length < minFiles) {
					setRejections([
						...fileRejections,
						...newFiles.map((file) => ({
							file,
							errors: [
								{
									code: "too-few-files",
									message: `At least ${minFiles} files are required`,
								},
							],
						})),
					]);
					setFiles([]);
					setInternalState("error");
					return;
				}

				setFiles(newFiles);
				setRejections(fileRejections);

				if (newFiles.length > 0) {
					setInternalState("success");
				} else if (fileRejections.length > 0) {
					setInternalState("error");
				} else {
					setInternalState("idle");
				}

				onDrop?.(newFiles, fileRejections, event);
			},
			[onDrop, multiple, minFiles]
		);

		const handleDropAccepted = React.useCallback(
			(acceptedFiles: File[], event: React.DragEvent<HTMLElement>) => {
				// For single file mode, only keep the last file
				const newFiles = multiple ? acceptedFiles : acceptedFiles.slice(-1);

				// Check if we have too few files
				if (multiple && minFiles > 0 && newFiles.length < minFiles) {
					setInternalState("error");
					return;
				}

				setInternalState("success");
				onDropAccepted?.(newFiles, event);
			},
			[onDropAccepted, multiple, minFiles]
		);

		const handleDropRejected = React.useCallback(
			(
				fileRejections: FileRejection[],
				event: React.DragEvent<HTMLElement>
			) => {
				setInternalState("error");
				onDropRejected?.(fileRejections, event);
			},
			[onDropRejected]
		);

		const removeFile = (file: File) => {
			const newFiles = [...files];
			newFiles.splice(newFiles.indexOf(file), 1);
			setFiles(newFiles);

			// Check if we now have too few files
			if (multiple && minFiles > 0 && newFiles.length < minFiles) {
				setInternalState("error");
				return;
			}

			if (newFiles.length === 0 && rejections.length === 0) {
				setInternalState("idle");
			}
		};

		const removeRejection = (rejection: FileRejection) => {
			const newRejections = [...rejections];
			newRejections.splice(newRejections.indexOf(rejection), 1);
			setRejections(newRejections);

			if (files.length === 0 && newRejections.length === 0) {
				setInternalState("idle");
			}
		};

		const {
			getRootProps,
			getInputProps,
			isDragActive,
			isDragAccept,
			isDragReject,
		} = useDropzone({
			onDrop: handleDrop,
			onDropAccepted: handleDropAccepted,
			onDropRejected: handleDropRejected,
			multiple,
			maxFiles: multiple ? maxFiles : 1,
			...props,
		});

		// Update internal state based on drag status
		React.useEffect(() => {
			if (isLoading) {
				setInternalState("loading");
			} else if (isDragActive) {
				setInternalState("dragging");
			} else if (files.length > 0) {
				// Check if we have too few files
				if (multiple && minFiles > 0 && files.length < minFiles) {
					setInternalState("error");
				} else {
					setInternalState("success");
				}
			} else if (rejections.length > 0) {
				setInternalState("error");
			} else {
				setInternalState("idle");
			}
		}, [
			isDragActive,
			files.length,
			rejections.length,
			isLoading,
			multiple,
			minFiles,
		]);

		const renderMessage = () => {
			switch (state) {
				case "dragging":
					return (
						<p className="text-center text-muted-foreground">{dragMessage}</p>
					);
				case "success":
					return <p className="text-center text-success">{successMessage}</p>;
				case "error":
					return <p className="text-center text-destructive">{errorMessage}</p>;
				case "loading":
					return <p className="text-center text-primary">{loadingMessage}</p>;
				default:
					return (
						<p className="text-center">
							{multiple
								? idleMessage
								: idleMessage.toString().replace("files", "file")}
						</p>
					);
			}
		};

		const renderIcon = () => {
			switch (state) {
				case "dragging":
					return dragIcon;
				case "success":
					return successIcon;
				case "error":
					return errorIcon;
				case "loading":
					return loadingIcon;
				default:
					return icon;
			}
		};

		const renderPreviews = () => {
			if (!showPreviews || files.length === 0) return null;

			const filesToShow = files.slice(0, maxPreviews);
			const hasMore = files.length > maxPreviews;

			return (
				<div className="mt-4 w-full">
					<h4 className="text-sm font-medium mb-2">Files</h4>
					<ul className="space-y-2">
						{filesToShow.map((file, index) => (
							<li
								key={`${file.name}-${index}`}
								className="flex items-center justify-between p-2 bg-background rounded border"
							>
								{previewRenderer ? (
									previewRenderer(file)
								) : (
									<div className="flex items-center space-x-2">
										<File className="h-4 w-4 text-muted-foreground" />
										<span className="text-sm truncate max-w-[200px]">
											{file.name}
										</span>
										<span className="text-xs text-muted-foreground">
											{(file.size / 1024).toFixed(1)} KB
										</span>
									</div>
								)}
								{showRemoveButton && !isLoading && (
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											removeFile(file);
										}}
										className="text-muted-foreground hover:text-destructive"
										disabled={isLoading}
									>
										<X className="h-4 w-4" />
										<span className="sr-only">Remove file</span>
									</button>
								)}
							</li>
						))}
						{hasMore && (
							<li className="text-xs text-muted-foreground text-center">
								+{files.length - maxPreviews} more file(s)
							</li>
						)}
					</ul>
				</div>
			);
		};

		const renderRejections = () => {
			if (rejections.length === 0) return null;

			return (
				<div className="mt-4 w-full">
					<h4 className="text-sm font-medium text-destructive mb-2">
						Rejected Files
					</h4>
					<ul className="space-y-2">
						{rejections.map(({ file, errors }, index) => (
							<li
								key={`${file.name}-${index}`}
								className="flex items-center justify-between p-2 bg-destructive/10 rounded border border-destructive"
							>
								<div className="flex flex-col">
									<div className="flex items-center space-x-2">
										<AlertCircle className="h-4 w-4 text-destructive" />
										<span className="text-sm truncate max-w-[200px]">
											{file.name}
										</span>
									</div>
									<ul className="text-xs text-destructive mt-1">
										{errors.map((error) => (
											<li key={error.code}>{error.message}</li>
										))}
									</ul>
								</div>
								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										removeRejection({ file, errors });
									}}
									className="text-muted-foreground hover:text-destructive"
								>
									<X className="h-4 w-4" />
									<span className="sr-only">Remove rejection</span>
								</button>
							</li>
						))}
					</ul>
				</div>
			);
		};

		// Add file count validation message
		const renderFileCountValidation = () => {
			if (!multiple || (files.length >= minFiles && files.length <= maxFiles))
				return null;

			let message = "";
			if (files.length < minFiles) {
				message = `At least ${minFiles} file${
					minFiles !== 1 ? "s" : ""
				} required`;
			} else if (files.length > maxFiles) {
				message = `Maximum ${maxFiles} file${
					maxFiles !== 1 ? "s" : ""
				} allowed`;
			}

			if (!message) return null;

			return (
				<div className="mt-2 text-xs text-destructive flex items-center gap-1">
					<AlertCircle className="h-3 w-3" />
					<span>{message}</span>
				</div>
			);
		};

		return (
			<div className="w-full">
				<div
					{...getRootProps({
						className: cn(
							dropzoneVariants({ size, variant, state }),
							className
						),
					})}
					ref={ref}
				>
					<input {...getInputProps()} disabled={isLoading} />
					<div className="flex flex-col items-center justify-center text-center p-4">
						{renderIcon()}
						{renderMessage()}
						{multiple &&
							(minFiles > 0 || maxFiles < Number.POSITIVE_INFINITY) && (
								<p className="text-xs text-muted-foreground mt-2">
									{minFiles > 0 && maxFiles < Number.POSITIVE_INFINITY
										? `${minFiles} to ${maxFiles} files`
										: minFiles > 0
										? `At least ${minFiles} files`
										: `Up to ${maxFiles} files`}
								</p>
							)}
					</div>
				</div>

				{renderFileCountValidation()}

				{showFileList && (
					<>
						{fileListRenderer ? fileListRenderer(files) : renderPreviews()}
						{rejectionListRenderer
							? rejectionListRenderer(rejections)
							: renderRejections()}
					</>
				)}
			</div>
		);
	}
);

Dropzone.displayName = "Dropzone";

export { Dropzone };
