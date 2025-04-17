"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { markdownComponents } from "./MarkdownComponents";
import { Button } from "@/components/ui/button";
import { Copy, Check, RefreshCw } from "lucide-react"; // Added RefreshCw
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { Message, UseChatHelpers } from "@ai-sdk/react"; // Added imports
import { ModelData } from "@/app/dashboard/actions"; // Added import
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem, // Keep if needed, maybe remove
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

// Update props interface
interface AIMessageProps {
  message: Message;
  messageIndex: number;
  messages: Message[];
  availableModels: ModelData[];
  append: UseChatHelpers["append"];
  chatId?: string; // Changed to string
}

export const AIMessage: React.FC<AIMessageProps> = ({
  message,
  messageIndex,
  messages,
  availableModels,
  append,
}) => {
  const { content } = message; // Extract content from message
  const { isCopied, handleCopy } = useCopyToClipboard({ text: content });
  const [regenModel, setRegenModel] = useState<string>(
    availableModels[0]?.slug || ""
  );

  const handleRegenerate = () => {
    const userMessage = messages[messageIndex - 1];
    // Ensure there is a preceding message and it's from the user
    if (!userMessage || userMessage.role !== "user") {
      console.error("Cannot regenerate without a preceding user message.");
      // Optionally show a toast notification here
      return;
    }

    console.log(
      `Regenerating message ${message.id} using model ${regenModel} based on user prompt: "${userMessage.content}"`
    );

    // Append the user message again with the selected model
    append(
      { role: "user", content: userMessage.content },
      {
        body: {
          model: regenModel, // Pass the selected model slug
          // Optionally pass chatId if needed by backend for context, though useChat usually handles this
          // chatId: chatId
        },
      }
    );
  };

  return (
    <div>
      <div
        className={`rounded-lg max-w-full bg-gradient-to-r from-slate-50 to-slate-200 prose prose-sm dark:prose-invert p-4`}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={[rehypeKatex]}
          components={markdownComponents}
        >
          {content}
        </ReactMarkdown>
      </div>
      {/* Container for action buttons */}
      <div className="flex items-center gap-1 mt-1">
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

        <span className="text-xs text-muted-foreground px-1">
          "Unknown model"
        </span>

        {/* Regenerate Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              disabled={messageIndex === 0} // Disable if it's the first message
              title="Regenerate response"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="sr-only">Regenerate</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            {" "}
            {/* Adjust width as needed */}
            <DropdownMenuLabel>Regenerate with:</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Select value={regenModel} onValueChange={setRegenModel}>
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
            <DropdownMenuItem
              asChild // Use asChild to make the whole item clickable like a button
              className="mt-1 cursor-pointer"
              onSelect={(e) => {
                e.preventDefault(); // Prevent dropdown from closing immediately if needed
                handleRegenerate();
              }}
            >
              {/* Use a Button inside DropdownMenuItem for better styling/semantics */}
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
