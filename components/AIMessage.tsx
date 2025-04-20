"use client";

import React, { useState, SyntheticEvent, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";

import { markdownComponents } from "./MarkdownComponents";
import { Button } from "@/components/ui/button";
import {
  Copy,
  Check,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { Message } from "@ai-sdk/react";
import { ModelData } from "@/app/dashboard/actions";
import { toast } from "sonner";
import { extractModelFromSlug } from "@/utils/extract-model-name";
import { loadAIMessagesForUserMessage } from "@/app/dashboard/chatActions";

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
  onRegenerate: (
    modelSlug: string,
    modelId: number | null,
    messageId: string
  ) => void;
  isStreaming?: boolean; // Whether this message is currently streaming
  reloadTrigger?: number; // Trigger to reload messages when incremented
}

export const AIMessage: React.FC<AIMessageProps> = ({
  message,
  messageIndex,
  messages,
  availableModels,
  chatId,
  modelName,
  onRegenerate,
  isStreaming = false,
  reloadTrigger = 0,
}) => {
  // State to track the current content to copy
  const [contentToCopy, setContentToCopy] = useState(message.content);

  // State to hold the selected ModelData object for regeneration
  const [regenModelObject, setRegenModelObject] = useState<ModelData | null>(
    availableModels[0] || null // Default to the first available model object
  );

  // State for carousel of AI responses
  const [allResponses, setAllResponses] = useState<Message[]>([message]);
  const [currentResponseIndex, setCurrentResponseIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate the user message index (how many user messages came before this AI message)
  const userMessageIndex = React.useMemo(() => {
    let count = 0;
    for (let i = 0; i < messageIndex; i++) {
      if (messages[i].role === "user") {
        count++;
      }
    }
    return count - 1; // Subtract 1 because we want the index of the user message this AI message is responding to
  }, [messageIndex, messages]);

  // Load all AI responses for this user message
  useEffect(() => {
    if (!chatId || userMessageIndex < 0) return;

    // Skip loading during streaming to avoid UI flicker
    if (isStreaming) return;

    console.log(
      `[AIMessage] Loading responses for user message ${userMessageIndex}, trigger: ${reloadTrigger}`
    );

    const loadResponses = async () => {
      setIsLoading(true);
      try {
        const responses = await loadAIMessagesForUserMessage(
          chatId,
          userMessageIndex
        );
        if (responses.length > 0) {
          console.log(`[AIMessage] Loaded ${responses.length} responses`);
          setAllResponses([...responses]);

          // Always set to the last (newest) response
          setCurrentResponseIndex(responses.length - 1);
        } else {
          console.log(
            `[AIMessage] No responses found, using current message as fallback`
          );
          setAllResponses([message]);
        }
      } catch (error) {
        console.error("Failed to load AI responses:", error);
        // Keep the current message as fallback
        setAllResponses([message]);
      } finally {
        setIsLoading(false);
      }
    };

    loadResponses();
  }, [
    chatId,
    isStreaming,
    message,
    message.id,
    reloadTrigger,
    userMessageIndex,
  ]);

  // When streaming ends, trigger a reload
  useEffect(() => {
    if (!isStreaming && chatId && userMessageIndex >= 0) {
      // Small delay to ensure database has been updated
      const timer = setTimeout(() => {
        console.log(`[AIMessage] Streaming ended, reloading responses`);
        const loadResponses = async () => {
          try {
            const responses = await loadAIMessagesForUserMessage(
              chatId,
              userMessageIndex
            );
            if (responses.length > 0) {
              setAllResponses([...responses]);
              setCurrentResponseIndex(responses.length - 1);
            }
          } catch (error) {
            console.error(
              "Failed to reload AI responses after streaming:",
              error
            );
          }
        };

        loadResponses();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [chatId, isStreaming, message, userMessageIndex]);

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
    onRegenerate(regenModelObject.slug, regenModelObject.id, message.id);
  };

  // Get the current response to display, with optimistic updates for streaming
  const currentResponse = isStreaming
    ? message // During streaming, always show the current message
    : allResponses[currentResponseIndex] || message;

  // Ensure content is a string for ReactMarkdown
  const contentAsString =
    typeof currentResponse.content === "string"
      ? currentResponse.content
      : String(currentResponse.content || "");

  // Update the content to copy whenever the displayed content changes
  useEffect(() => {
    setContentToCopy(contentAsString);
  }, [contentAsString]);

  const { isCopied, handleCopy } = useCopyToClipboard({
    text: contentToCopy,
  });

  // Safely access the model name from data
  const currentModelName =
    typeof currentResponse.data === "object" &&
    currentResponse.data !== null &&
    "modelName" in currentResponse.data
      ? currentResponse.data.modelName
      : modelName;
  const hasMultipleResponses = allResponses.length > 1;

  // Navigation handlers
  const handlePrevResponse = () => {
    if (currentResponseIndex > 0) {
      setCurrentResponseIndex(currentResponseIndex - 1);
    }
  };

  const handleNextResponse = () => {
    if (currentResponseIndex < allResponses.length - 1) {
      setCurrentResponseIndex(currentResponseIndex + 1);
    }
  };

  return (
    <div>
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center space-x-2 mb-2">
          <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
          <span className="text-xs text-muted-foreground">
            Loading previous responses...
          </span>
        </div>
      )}

      {/* AI message bubble with smooth transitions */}
      <div className="rounded-lg max-w-full bg-gradient-to-r from-slate-50 to-slate-200 prose prose-sm dark:prose-invert p-4">
        <div className="transition-opacity duration-300 ease-in-out">
          <ReactMarkdown
            key={currentResponse.id || currentResponseIndex}
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={markdownComponents}
          >
            {contentAsString}
          </ReactMarkdown>
        </div>
      </div>

      {/* Action bar - only show when not streaming */}
      {!isStreaming && (
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
          {currentModelName && (
            <span className="text-xs text-muted-foreground px-1">
              {typeof currentModelName === "string"
                ? currentModelName.includes(":")
                  ? extractModelFromSlug(currentModelName)
                  : currentModelName
                : String(currentModelName)}
            </span>
          )}

          {/* Version indicator - only show if there are multiple responses */}
          {hasMultipleResponses && (
            <span className="text-xs text-muted-foreground px-1">
              {currentResponseIndex + 1}/{allResponses.length}
            </span>
          )}

          {/* Navigation buttons - only show if there are multiple responses */}
          {hasMultipleResponses && (
            <>
              <Button
                onClick={handlePrevResponse}
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                disabled={currentResponseIndex === 0}
                title="Previous version"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous version</span>
              </Button>
              <Button
                onClick={handleNextResponse}
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                disabled={currentResponseIndex === allResponses.length - 1}
                title="Next version"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next version</span>
              </Button>
            </>
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
      )}
    </div>
  );
};
