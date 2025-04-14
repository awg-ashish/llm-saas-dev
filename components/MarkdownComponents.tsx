import React from "react";
import Image from "next/image"; // Import Next.js Image component
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"; // Changed Light to Prism
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button"; // Added Button import
import { Copy, Check } from "lucide-react"; // Added icon imports
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"; // Added hook import

interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode; // Made children optional
}

// Helper component for code blocks with copy functionality
interface InternalCodeBlockProps extends React.HTMLAttributes<HTMLElement> {
  language: string;
  codeString: string;
}

const InternalCodeBlock: React.FC<InternalCodeBlockProps> = ({
  language,
  codeString,
  ...props
}) => {
  const { isCopied, handleCopy } = useCopyToClipboard({ text: codeString });

  return (
    <div className="h-fit">
      {" "}
      {/* Added group, bg, rounded, margin */}
      <div className="flex items-center justify-between px-2">
        {" "}
        {/* Header for lang + button */}
        <span className="text-xs text-muted-foreground">{language}</span>
        <Button
          onClick={handleCopy}
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-75 hover:opacity-100 hover:cursor-pointer transition-opacity" // Adjusted visibility/positioning
        >
          {isCopied ? (
            <Check className="h-4 w-4 opacity-100 text-green-800" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          <span className="sr-only">Copy code</span>
        </Button>
      </div>
      <SyntaxHighlighter
        className="rounded-lg" // Removed className="rounded-lg" as parent div handles rounding
        style={vs as any} // eslint-disable-line @typescript-eslint/no-explicit-any
        language={language}
        PreTag="div"
        {...props}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );
};

export const markdownComponents = {
  // Paragraphs with dark gray text
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-4 last:mb-2 text-gray-700" {...props} />
  ),

  // Links that open in a new tab
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="text-blue-600 underline hover:text-blue-700"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),

  // Code block with syntax highlighting and inline code styling
  code: ({ className, children, ...props }: CodeProps) => {
    const match = /language-(\w+)/.exec(className || "");

    // Inline code
    if (!(className && match)) {
      return (
        <code
          className="border rounded px-1 py-0.5 font-mono text-sm bg-muted text-muted-foreground" // Adjusted inline style slightly
          {...props}
        >
          {children}
        </code>
      );
    }
    // Block code
    else {
      const language = match[1] || "code"; // Get language or default to text
      const codeString = String(children).replace(/\n$/, ""); // Extract code string
      return (
        <InternalCodeBlock
          language={language}
          codeString={codeString}
          {...props} // Pass down other props
        />
      );
    }
  },

  // Unordered list styling
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc list-inside my-2 ml-4 text-gray-700" {...props} />
  ),

  // Ordered list styling
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol
      className="list-decimal list-inside my-2 ml-4 text-gray-700"
      {...props}
    />
  ),

  // List item styling
  li: (props: React.LiHTMLAttributes<HTMLLIElement>) => (
    <li className="mb-1 text-gray-700" {...props} />
  ),

  // Headings for a modern look and dark gray text
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1
      className="text-3xl font-black mt-6 mb-12 border-b pb-4 text-gray-700"
      {...props}
    />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2
      className="text-2xl font-bold mt-8 mb-4 py-2 text-gray-700"
      {...props}
    />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="text-xl font-semibold mt-4 mb-2 text-gray-700" {...props} />
  ),
  h4: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h4 className="text-lg font-medium mt-2 mb-1 text-gray-700" {...props} />
  ),
  h5: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h5 className="text-base font-medium mt-2 mb-1 text-gray-700" {...props} />
  ),
  h6: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h6 className="text-sm font-medium mt-2 mb-1 text-gray-700" {...props} />
  ),

  // Blockquote for a modern, elegant design
  blockquote: (props: React.BlockquoteHTMLAttributes<HTMLElement>) => (
    <blockquote
      className="border-l-4 border-gray-300 pl-3 italic my-2 text-gray-600"
      {...props}
    />
  ),

  // Horizontal rule for section separation
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-8 border-gray-300" {...props} />
  ),

  // Bold text styling
  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-gray-700" {...props} />
  ),

  // Italic text styling
  em: (props: React.HTMLAttributes<HTMLElement>) => (
    <em className="italic text-gray-700" {...props} />
  ),

  // Image styling using Next.js Image for optimization and accessibility
  img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    // Ensure src is present, otherwise return null or a placeholder
    if (!props.src) {
      return null;
    }
    // Remove className, width, and height from props to avoid conflicts
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { className, width, height, ...restProps } = props;
    return (
      <Image
        className="my-4 rounded-lg" // Apply styling class here
        src={props.src}
        alt={props.alt || ""} // Use provided alt text or default to empty string
        width={0} // Required by Next.js Image when dimensions are unknown initially
        height={0} // Required by Next.js Image when dimensions are unknown initially
        sizes="100vw" // Describe the image size relative to the viewport
        style={{ width: "100%", height: "auto" }} // Maintain aspect ratio
        // Pass remaining props, excluding className, width, height
        {...restProps}
      />
    );
  },

  // Table styling for a clean, modern look
  table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
    <table
      className="table-auto border-collapse border border-gray-300 my-2"
      {...props}
    />
  ),
  thead: (props: React.HTMLAttributes<HTMLTableSectionElement>) => (
    <thead className="bg-gray-200" {...props} />
  ),
  th: (props: React.ThHTMLAttributes<HTMLTableCellElement>) => (
    <th
      className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700"
      {...props}
    />
  ),
  td: (props: React.TdHTMLAttributes<HTMLTableCellElement>) => (
    <td className="border border-gray-300 px-2 py-1 text-gray-700" {...props} />
  ),
};

export default markdownComponents;
