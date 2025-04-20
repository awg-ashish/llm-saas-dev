// MarkdownComponents.tsx
import React from "react";
import Image from "next/image";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vs } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

// ——————————————————————————————————————————————
// 1) Extract your <p> wrapper into a named component
// ——————————————————————————————————————————————
const Paragraph: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = (
  props
) => <p className="mb-4 last:mb-2 text-gray-700" {...props} />;

interface CodeProps extends React.HTMLAttributes<HTMLElement> {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

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
      <div className="flex items-center justify-between px-2">
        <span className="text-xs text-muted-foreground">{language}</span>
        <Button
          onClick={handleCopy}
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-75 hover:opacity-100 transition-opacity"
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
        className="rounded-lg"
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        style={vs as any}
        language={language}
        PreTag="div"
        {...props}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );
};

// ——————————————————————————————————————————————
// 2) Your final mapping object
// ——————————————————————————————————————————————
export const markdownComponents = {
  // Use the named Paragraph component here
  p: Paragraph,

  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      className="text-blue-600 underline hover:text-blue-700"
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    />
  ),

  code: ({ className, children, ...props }: CodeProps) => {
    const match = /language-(\w+)/.exec(className || "");
    if (!match) {
      // inline code
      return (
        <code
          className="border rounded px-1 py-0.5 font-mono text-sm bg-muted text-muted-foreground"
          {...props}
        >
          {children}
        </code>
      );
    }
    // block code
    const language = match[1]!;
    const codeString = String(children).replace(/\n$/, "");
    return (
      <InternalCodeBlock
        language={language}
        codeString={codeString}
        {...props}
      />
    );
  },

  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="list-disc list-inside my-2 ml-4 text-gray-700" {...props} />
  ),

  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol
      className="list-decimal list-inside my-2 ml-4 text-gray-700"
      {...props}
    />
  ),

  // 3) In li, compare child.type directly to our Paragraph component
  li: ({
    children,
    ...props
  }: React.PropsWithChildren<React.LiHTMLAttributes<HTMLLIElement>>) => {
    const content = React.Children.map(children, (child) => {
      if (
        React.isValidElement<React.HTMLAttributes<HTMLParagraphElement>>(
          child
        ) &&
        child.type === Paragraph
      ) {
        // unwrap the auto‑wrapped <p>
        return child.props.children;
      }
      return child;
    });

    return (
      <li className="mb-4 text-gray-700" {...props}>
        {content}
      </li>
    );
  },

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
    <h3 className="text-xl font-semibold mt-8 mb-4 text-gray-700" {...props} />
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

  blockquote: (props: React.BlockquoteHTMLAttributes<HTMLElement>) => (
    <blockquote
      className="border-l-4 border-gray-300 pl-3 italic my-2 text-gray-600"
      {...props}
    />
  ),

  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-8 border-gray-300" {...props} />
  ),

  strong: (props: React.HTMLAttributes<HTMLElement>) => (
    <strong className="font-semibold text-gray-700" {...props} />
  ),

  em: (props: React.HTMLAttributes<HTMLElement>) => (
    <em className="italic text-gray-700" {...props} />
  ),

  img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    if (!props.src) return null;
    // strip out unwanted keys so Next/Image can size itself
    return (
      <Image
        className="my-4 rounded-lg"
        src={props.src}
        alt={props.alt || ""}
        width={0}
        height={0}
        sizes="100vw"
        style={{ width: "100%", height: "auto" }}
      />
    );
  },

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
