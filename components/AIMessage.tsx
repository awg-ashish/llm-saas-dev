"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { markdownComponents } from "./MarkdownComponents";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface AIMessageProps {
  content: string;
}

export const AIMessage: React.FC<AIMessageProps> = ({ content }) => {
  const { isCopied, handleCopy } = useCopyToClipboard({ text: content });

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
      {/* Moved button outside the message bubble div */}
      <div>
        <Button
          onClick={handleCopy}
          size="icon"
          variant="ghost"
          className="mt-2 h-6 w-6 text-muted-foreground hover:cursor-copy" // Removed absolute/hover classes, added margin-top
        >
          {isCopied ? (
            <Check className="h-4 w-4 text-green-500" /> // Keep check icon green
          ) : (
            <Copy className="h-4 w-4" />
          )}
          <span className="sr-only">Copy message</span>
        </Button>
      </div>
    </div>
  );
};
