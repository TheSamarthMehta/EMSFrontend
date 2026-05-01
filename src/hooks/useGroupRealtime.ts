import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";

let socketRef: Socket | null = null;

function getSocket(token: string): Socket {
  if (socketRef) return socketRef;
  const baseUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1").replace("/api/v1", "");
  socketRef = io(baseUrl, {
    autoConnect: true,
    transports: ["websocket"],
    auth: { token },
  });
  return socketRef;
}

export function useGroupRealtime(groupId: string | undefined) {
  const queryClient = useQueryClient();
  const token = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!groupId || !token) return;
    const socket = getSocket(token);
    socket.emit("group:join", groupId);

    const invalidate = () => {
      void queryClient.invalidateQueries({ queryKey: ["group", groupId] });
      void queryClient.invalidateQueries({ queryKey: ["groups"] });
      void queryClient.invalidateQueries({ queryKey: ["group-expenses", groupId] });
      void queryClient.invalidateQueries({ queryKey: ["group-balances", groupId] });
      void queryClient.invalidateQueries({ queryKey: ["group-activity", groupId] });
      void queryClient.invalidateQueries({ queryKey: ["group-analytics", groupId] });
      void queryClient.invalidateQueries({ queryKey: ["group-invites", groupId] });
    };

    socket.on("group:updated", invalidate);
    socket.on("member:invited", invalidate);
    socket.on("member:joined", invalidate);
    socket.on("expense:added", invalidate);
    socket.on("settlement:created", invalidate);
    socket.on("activity:created", invalidate);
    socket.on("balance:updated", invalidate);

    return () => {
      socket.emit("group:leave", groupId);
      socket.off("group:updated", invalidate);
      socket.off("member:invited", invalidate);
      socket.off("member:joined", invalidate);
      socket.off("expense:added", invalidate);
      socket.off("settlement:created", invalidate);
      socket.off("activity:created", invalidate);
      socket.off("balance:updated", invalidate);
    };
  }, [groupId, token, queryClient]);
}
