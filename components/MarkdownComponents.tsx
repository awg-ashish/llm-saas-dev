import React from "react";
import Image from "next/image"; // Import Next.js Image component
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrowNightBlue } from "react-syntax-highlighter/dist/esm/styles/hljs";
import type { CSSProperties } from "react";

// Spread the imported theme into a new object to ensure it's a plain record
const theme = { ...tomorrowNightBlue };

interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode; // Made children optional
}

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
  code: ({ inline, className, children, ...props }: CodeProps) => {
    const match = /language-(\w+)/.exec(className || "");
    if (inline) {
      return (
        <code
          className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono text-gray-800"
          {...props}
        >
          {children}
        </code>
      );
    }
    return match ? (
      <div className="relative p-2">
        <span className="absolute top-1 left-2 p-2 text-xs text-gray-400">
          {match[1]}
        </span>

        <SyntaxHighlighter
          className="rounded-lg"
          //eslint-disable-next-line @typescript-eslint/no-explicit-any
          style={theme as any} // Revert to 'as any' to resolve persistent type error
          language={match[1]}
          PreTag="div"
          customStyle={
            {
              padding: 24,
            } as CSSProperties
          } // Added type assertion here
          {...props}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      </div>
    ) : null;
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
