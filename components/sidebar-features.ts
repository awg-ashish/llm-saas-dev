import {
  Compass,
  MessageSquare,
  Image,
  Video,
  Mic,
  GitCompare,
  Settings,
} from "lucide-react";

export const SIDEBAR_FEATURES = [
  {
    id: "explore",
    name: "Explore",
    icon: Compass,
    component: null,
  },
  {
    id: "chat",
    name: "Chat",
    icon: MessageSquare,
    component: "ChatSidebarContent",
  },
  {
    id: "images",
    name: "Generate Images",
    icon: Image,
    component: null,
  },
  {
    id: "videos",
    name: "Generate Videos",
    icon: Video,
    component: null,
  },
  {
    id: "voice",
    name: "Generate Voice",
    icon: Mic,
    component: null,
  },
  {
    id: "compare",
    name: "Compare",
    icon: GitCompare,
    component: null,
  },
  {
    id: "tools",
    name: "Tools",
    icon: Settings,
    component: null,
  },
];
