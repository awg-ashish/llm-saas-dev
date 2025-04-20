"use client";

import React, { useState, SyntheticEvent } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import { markdownComponents } from "./MarkdownComponents";
import { Button } from "@/components/ui/button";
import { Copy, Check, RefreshCw } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { Message, UseChatHelpers } from "@ai-sdk/react";
import { ModelData } from "@/app/dashboard/actions";
import { toast } from "sonner";
import { extractModelFromSlug } from "@/utils/extract-model-name";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AIMessageProps {
  message: Message;
  messageIndex: number;
  messages: Message[];
  availableModels: ModelData[];
  chatId?: string; // stored as string in DB
  modelName?: string | null; // model used for this AI reply
  onRegenerate: (modelSlug: string, modelId: number | null) => void;
}

export const AIMessage: React.FC<AIMessageProps> = ({
  message,
  messageIndex,
  messages,
  availableModels,
  chatId,
  modelName,
  onRegenerate,
}) => {
  const { content } = message;
  const { isCopied, handleCopy } = useCopyToClipboard({ text: content });
  // State to hold the selected ModelData object for regeneration
  const [regenModelObject, setRegenModelObject] = useState<ModelData | null>(
    availableModels[0] || null // Default to the first available model object
  );

  // Handler for when the regeneration model selection changes
  const handleRegenModelChange = (selectedSlug: string) => {
    const selectedModel = availableModels.find(
      (model) => model.slug === selectedSlug
    );
    setRegenModelObject(selectedModel || null); // Store the selected object
  };

  /**
   * Regenerate the current AI response using the preceding user message.
   * Works whether invoked from a React event (SyntheticEvent) or a Radix UI
   * event (plain DOM Event). Uses the new onRegenerate prop.
   */
  const handleRegenerate = (e?: Event | SyntheticEvent<Element, Event>) => {
    e?.preventDefault?.();

    // Check if a model object is selected
    if (!regenModelObject) {
      toast.error("Please select a model to regenerate with.");
      return;
    }

    // Call the parent's handler with the selected slug and ID
    console.log(
      `[AIMessage] Calling onRegenerate with slug: ${regenModelObject.slug}, id: ${regenModelObject.id}`
    );
    onRegenerate(regenModelObject.slug, regenModelObject.id);
  };

  return (
    <div>
      {/* AI message bubble */}
      <div className="rounded-lg max-w-full bg-gradient-to-r from-slate-50 to-slate-200 prose prose-sm dark:prose-invert p-4">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      </div>

      {/* Action bar */}
      <div className="flex items-center gap-1 mt-1">
        {/* Copy button */}
        <Button
          onClick={handleCopy}
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          title="Copy message"
        >
          {isCopied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          <span className="sr-only">Copy message</span>
        </Button>

        {/* Model tag */}
        {modelName && (
          <span className="text-xs text-muted-foreground px-1">
            {modelName.includes(":")
              ? extractModelFromSlug(modelName)
              : modelName}
          </span>
        )}

        {/* Regenerate dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              disabled={messageIndex === 0}
              title="Regenerate response"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="sr-only">Regenerate</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Regenerate with:</DropdownMenuLabel>
            <DropdownMenuSeparator />

            {/* Model selector */}
            <div className="p-2">
              <Select
                value={regenModelObject?.slug || ""}
                onValueChange={handleRegenModelChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select model" />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map((model) => (
                    <SelectItem key={model.id} value={model.slug}>
                      {model.model_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Regenerate button */}
            <DropdownMenuItem
              asChild
              className="mt-1 cursor-pointer"
              onSelect={(e) => handleRegenerate(e)}
            >
              <Button size="sm" className="w-full justify-center">
                Regenerate
              </Button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
