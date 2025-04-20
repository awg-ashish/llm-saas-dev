"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react"; // Add useCallback
import { useChat, Message, UseChatHelpers } from "@ai-sdk/react"; // Import Message type and UseChatHelpers
import { v4 as uuidv4 } from "uuid"; // Import uuid
import { FaUser, FaRobot, FaPaperPlane } from "react-icons/fa";
import { Square } from "lucide-react"; // Import Square icon for stop
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useSidebar } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { extractModelFromSlug } from "@/utils/extract-model-name"; // Import extractModelFromSlug
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Settings, LogOut } from "lucide-react";
import { AIMessage } from "./AIMessage"; // Import the new AIMessage component
import { useRouter } from "next/navigation";
import { toast } from "sonner";
// Import ModelData type
import { ModelData } from "@/app/dashboard/actions"; // Adjust path if necessary
import { TypingIndicator } from "@/components/ui/typing-indicator";

interface ChatInterfaceProps {
  userName: string;
  onSignOut: () => Promise<void>;
  chatId?: string; // Changed to string for UUID
  initialMessages?: Message[];
  availableModels: ModelData[];
  initialModelId?: number; // Keep as number, relates to models table
}

export function ChatInterface({
  userName,
  onSignOut,
  chatId,
  initialMessages,
  availableModels,
  initialModelId,
}: ChatInterfaceProps) {
  const router = useRouter();
  const { state: sidebarState } = useSidebar();
  const isSidebarOpen = sidebarState === "expanded";

  // Determine the initial model slug based on initialModelId or the first available model
  const initialModelSlug = useMemo(() => {
    if (initialModelId) {
      const foundModel = availableModels.find(
        (model) => model.id === initialModelId
      );
      return foundModel?.slug || availableModels[0]?.slug || "";
    }
    return availableModels[0]?.slug || "";
  }, [availableModels, initialModelId]);

  const [selectedModel, setselectedModel] = useState(initialModelSlug);
  // Determine the initial model ID based on the initial slug
  const [selectedModelId, setselectedModelId] = useState<number | null>(() => {
    const foundModel = availableModels.find(
      (model) => model.slug === initialModelSlug
    );
    return foundModel?.id || availableModels[0]?.id || null;
  });

  // Ref to store the model ID intended for the current reload operation
  const modelIdForReloadRef = useRef<number | null>(null);

  // Update the model ID when the slug changes
  const handleModelChange = (value: string) => {
    setselectedModel(value);
    // Find and set the corresponding model ID
    const foundModel = availableModels.find((model) => model.slug === value);
    setselectedModelId(foundModel?.id || null);
    console.log(
      `[ChatInterface] Model changed to: ${value}, ID: ${foundModel?.id}`
    );
  };

  // Save the user message for persistence - chatIdToUse is now string
  const saveUserMessage = async (chatIdToUse: string, content: string) => {
    try {
      const { saveMessage } = await import("@/app/dashboard/chatActions");
      await saveMessage(
        chatIdToUse, // Pass string UUID
        { role: "user", content: content, createdAt: new Date() },
        undefined // Model ID not needed for user message save here
      );
      console.log(`User message saved for chat ${chatIdToUse}`);
    } catch (error) {
      console.error("Failed to save user message:", error);
      // Optionally show toast error
    }
  };

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    stop, // Import stop
    reload, // Destructure reload
    // status, // REMOVED DUPLICATE
  } = useChat({
    // Use a single consistent API endpoint
    api: "/api/chat",
    id: chatId, // Pass string UUID directly (useChat uses this for identifying the chat instance)
    initialMessages: initialMessages,
    sendExtraMessageFields: true,
    onFinish: async (message) => {
      if (chatId && message.role === "assistant") {
        const aiSaveToastId = toast.loading("Saving AI message...");
        try {
          const { saveMessage } = await import("@/app/dashboard/chatActions");

          let modelIdToSave: number | undefined = undefined;
          let source = "unknown";

          // 1. Prioritize modelId from annotations
          if (message.annotations) {
            console.log(
              "[onFinish] Checking annotations:",
              message.annotations
            );
            const modelAnnotation = message.annotations.find(
              (ann) =>
                typeof ann === "object" && ann !== null && "modelId" in ann
            );
            if (
              modelAnnotation &&
              typeof (modelAnnotation as any).modelId !== "undefined"
            ) {
              const parsedId = parseInt((modelAnnotation as any).modelId, 10);
              if (!isNaN(parsedId)) {
                modelIdToSave = parsedId;
                source = "annotation";
              } else {
                console.warn(
                  "[onFinish] Found modelId in annotation, but failed to parse:",
                  (modelAnnotation as any).modelId
                );
              }
            }
          }

          // 2. Fallback to reload ref (for manual regenerations)
          if (
            modelIdToSave === undefined &&
            modelIdForReloadRef.current !== null
          ) {
            modelIdToSave = modelIdForReloadRef.current;
            source = "reloadRef";
            modelIdForReloadRef.current = null; // Reset the ref after use
          }

          // 3. Fallback to current selectedModelId state (less reliable, but better than nothing)
          if (modelIdToSave === undefined && selectedModelId !== null) {
            modelIdToSave = selectedModelId;
            source = "componentState";
            console.warn(
              "[onFinish] Using component state selectedModelId as fallback."
            );
          }

          console.log(
            `[onFinish] Determined modelIdToSave: ${modelIdToSave} (Source: ${source})`
          );

          await saveMessage(
            chatId, // Pass string UUID
            {
              role: "assistant",
              content: message.content,
              createdAt: new Date(),
            },
            modelIdToSave // Pass the determined model ID (or undefined)
          );

          toast.success(
            `AI message saved successfully (Model ID: ${
              modelIdToSave ?? "N/A"
            })`,
            { id: aiSaveToastId }
          );
          console.log(
            `AI message saved for chat ${chatId} with model ID ${modelIdToSave} (Source: ${source})`
          );
        } catch (error) {
          console.error("Failed to save AI message:", error);
          toast.error(
            `Failed to save AI message: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            { id: aiSaveToastId } // Update the specific toast on error
          );
          modelIdForReloadRef.current = null; // Ensure ref is cleared on error too
        }
      }
    },
  });

  // Handler for regeneration requests from AIMessage
  // Moved after useChat hook to fix dependency error
  const handleReloadWithMessage = useCallback(
    async (modelSlug: string, modelId: number | null) => {
      console.log(
        `[ChatInterface] Reload triggered with model: ${modelSlug} (ID: ${modelId})`
      );
      // Store the modelId for onFinish to use
      modelIdForReloadRef.current = modelId;

      // Show loading toast (optional)
      const reloadToastId = toast.loading(
        `Regenerating with ${extractModelFromSlug(modelSlug)}...`
      );

      try {
        // Call reload, passing the selected model slug and ID in the body
        await reload({
          body: {
            model: modelSlug, // Send the slug for API routing
            modelId: modelId, // Send the ID for potential use/logging
          },
        });
        // Toast success will be handled by onFinish saving
        toast.dismiss(reloadToastId); // Dismiss loading if reload itself finishes (though onFinish is main indicator)
      } catch (error) {
        console.error("Reload failed:", error);
        toast.error(
          `Regeneration failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
          { id: reloadToastId }
        );
        modelIdForReloadRef.current = null; // Clear ref on error
      }
    },
    [reload] // Add reload to dependency array
  );

  // Custom submit handler
  const customHandleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const userPrompt = input.trim();

    if (userPrompt) {
      if (!chatId) {
        // --- New Chat Flow ---
        const clientChatId = uuidv4(); // Generate UUID on client
        console.log(`Generated client-side chat ID: ${clientChatId}`);
        const toastId = toast.loading("Creating new chat...");

        try {
          // 1. Call and await the initialization action
          const { initializeChat } = await import(
            "@/app/dashboard/chatActions"
          );
          await initializeChat(
            clientChatId,
            userPrompt,
            selectedModelId ?? undefined
          );
          console.log(`Chat ${clientChatId} initialized successfully.`);

          // 2. Refresh server data (for sidebar)
          router.refresh();

          // 3. Navigate to the new chat page
          router.push(`/dashboard/chat/${clientChatId}`); // No query param needed

          // 4. Clear input and show success
          handleInputChange({
            target: { value: "" },
          } as React.ChangeEvent<HTMLTextAreaElement>); // Reset input field
          toast.success("Chat created successfully", { id: toastId });
        } catch (error) {
          console.error("Failed to initialize new chat:", error);
          toast.error(`Failed to create chat: ${(error as Error).message}`, {
            id: toastId,
          });
          // Optionally remove the locally appended message if init failed
          // This requires managing message IDs more carefully if needed
        }
      } else {
        // --- Existing Chat Flow ---
        // 1. Save user message to DB (async, don't wait)
        saveUserMessage(chatId, userPrompt).catch((err) =>
          console.error("Background user message save failed:", err)
        );

        // 2. Let useChat handle appending locally and sending API request
        handleSubmit(e, {
          body: {
            model: selectedModel,
            modelId: selectedModelId,
          },
        });
      }
    } else {
      // Empty input, use default handler (which does nothing)
      handleSubmit(e);
    }
  };

  // Removed duplicate handleModelChange definition that was here

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({
          behavior: "smooth",
        });
      };
      if (status === "streaming") {
        requestAnimationFrame(scrollToBottom);
      } else {
        setTimeout(scrollToBottom, 0);
      }
    }
  }, [messages, status]); // Keep dependencies minimal

  // Ref to track chats that have already had an AI response triggered
  const autoTriggeredChats = useRef(new Set<string>());

  // Effect to trigger initial AI response on new chat load
  useEffect(() => {
    // Only run if:
    // - We have a chatId
    // - There's exactly one message loaded initially, and it's from the user
    // - We haven't already triggered for this chat
    const shouldTriggerAIResponse =
      chatId &&
      initialMessages?.length === 1 && // Check initialMessages specifically
      initialMessages[0].role === "user" &&
      messages.length === 1 && // Ensure local state also has only 1 message (the user one)
      !autoTriggeredChats.current.has(chatId) &&
      status === "ready"; // Only trigger if status is ready

    if (shouldTriggerAIResponse) {
      console.log(
        `[ChatInterface] Auto-triggering AI response for first message in chat ${chatId}`
      );

      // Mark this chat as triggered
      autoTriggeredChats.current.add(chatId);

      // Ensure we have a valid model to use
      const modelToUse =
        selectedModel || availableModels[0]?.slug || "openai:gpt-4o-mini";
      const modelIdToUse = selectedModelId || availableModels[0]?.id || null;

      console.log(`[ChatInterface] Calling reload() with model:`, {
        modelSlug: modelToUse,
        modelId: modelIdToUse,
        availableModelsLength: availableModels.length,
      });

      // Use reload instead of handleSubmit
      reload({
        body: {
          model: modelToUse,
          modelId: modelIdToUse,
        },
      });
      console.log("[ChatInterface] Initial AI response triggered via reload()");
    } else if (
      chatId &&
      initialMessages?.length === 1 &&
      messages.length === 1
    ) {
      // Log why we're not triggering for debugging
      console.log("[ChatInterface] Not triggering initial AI response:", {
        chatId,
        initialMessagesLength: initialMessages?.length,
        messagesLength: messages.length,
        firstMessageRole: initialMessages[0]?.role,
        status,
        alreadyTriggered: autoTriggeredChats.current.has(chatId),
      });
    }
  }, [
    chatId,
    initialMessages,
    messages,
    status,
    reload,
    selectedModel,
    selectedModelId,
    availableModels,
  ]);

  return (
    <div
      className={`flex flex-col h-screen bg-background fixed top-0 right-0 transition-all duration-200 ${
        isSidebarOpen ? "left-[16rem]" : "left-0"
      }`}
    >
      <header
        className={`flex items-center justify-between p-4 border-b bg-card text-card-foreground fixed top-0 right-0 z-10 transition-all duration-200 ${
          isSidebarOpen ? "left-[16rem]" : "left-0"
        }`}
      >
        <h1 className="text-xl font-semibold">LLM Chat</h1>
        <div className="flex items-center gap-4">
          <Select value={selectedModel} onValueChange={handleModelChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {/* Map over availableModels from props */}
              {availableModels.map((model) => (
                <SelectItem key={model.id} value={model.slug}>
                  {/* Use slug as value, display name */}
                  {model.model_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              Welcome, {userName}
            </span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="cursor-pointer h-8 w-8">
                  <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onSignOut} className="text-red-500">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto pt-16 pb-24 px-4 mt-4 mx-auto no-scrollbar">
        <div className="w-3xl mx-auto space-y-4 pb-4">
          {messages.length === 0 && (
            <div className="flex justify-center items-center h-full text-muted-foreground">
              <p>Start chatting by typing a message below.</p>
            </div>
          )}
          {messages.map(
            (
              m,
              index // Add index here
            ) => {
              // Extract modelName with priority for annotations (preferred) over deprecated data
              let modelName: string | null = null;
              let modelSlug: string | null = null;

              // First check for model info in annotations (recommended approach)
              if (m.annotations && m.annotations.length > 0) {
                const modelAnnotation = m.annotations.find(
                  (ann) =>
                    typeof ann === "object" &&
                    ann !== null &&
                    "modelName" in ann
                );

                if (modelAnnotation) {
                  const rawModelName = (
                    modelAnnotation as { modelName: string | null }
                  ).modelName;

                  // Check if this is a slug format (contains colon) or just a model name
                  if (rawModelName) {
                    if (rawModelName.includes(":")) {
                      modelName = extractModelFromSlug(rawModelName);
                      modelSlug = rawModelName;
                    } else {
                      modelName = rawModelName;
                    }
                    console.log(
                      `Found model name in annotations: ${rawModelName}, extracted: ${modelName}`
                    );
                  }
                }
              }

              // Debug log for troubleshooting
              if (m.role === "assistant") {
                console.log(
                  `Message ${index} model name: ${modelName || "unknown"}`
                );
              }

              return (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${
                    m.role === "user" ? "justify-end" : ""
                  }`}
                >
                  {m.role !== "user" && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <FaRobot />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={`rounded-lg p-3 max-w-[95%] ${
                      m.role === "user"
                        ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                        : "prose prose-sm dark:prose-invert"
                    }`}
                  >
                    {m.role === "user" ? (
                      <p className="text-sm whitespace-pre-wrap">{m.content}</p>
                    ) : (
                      // Pass required props to AIMessage, including modelName from data
                      <AIMessage
                        message={m}
                        messageIndex={index}
                        messages={messages}
                        availableModels={availableModels}
                        // append={append} // Remove append prop
                        chatId={chatId} // Pass string UUID
                        // Pass the extracted modelName
                        modelName={modelName}
                        // Pass the new handler for reload
                        onRegenerate={handleReloadWithMessage}
                        // Remove the old handler prop
                        // onRegenerationStart={handleRegenerationStarted}
                      />
                    )}
                  </div>
                  {m.role === "user" && (
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        <FaUser />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              );
            }
          )}
          {status === "streaming" && (
            <div className="flex items-center gap-3">
              <div className="rounded-lg w-30 h-2">
                <TypingIndicator />
              </div>
            </div>
          )}
        </div>
        <div ref={messagesEndRef} className="h-10" />
      </div>

      <footer
        className={`fixed bottom-0 border-t bg-card z-10 transition-all duration-200 ${
          isSidebarOpen ? "left-[16rem]" : "left-0"
        } right-0`}
      >
        <form
          onSubmit={customHandleSubmit}
          className="flex items-center gap-2 max-w-3xl mx-auto p-4"
        >
          <Textarea
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                const form = e.currentTarget.closest("form");
                if (form) {
                  const formEvent = new Event("submit", {
                    bubbles: true,
                    cancelable: true,
                  });
                  form.dispatchEvent(formEvent);
                }
              }
            }}
            placeholder="Type your message..."
            className="flex-1 resize-none"
            rows={1}
            disabled={status === "streaming"}
          />
          {status === "streaming" ? (
            <Button
              type="button"
              onClick={stop}
              variant="destructive" // Optional: Use a different variant for stop
            >
              <Square className="h-4 w-4" />
              <span className="sr-only">Stop</span>
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim()}>
              <FaPaperPlane className="h-4 w-4" />
              <span className="sr-only">Send</span>
            </Button>
          )}
        </form>
      </footer>
    </div>
  );
}
