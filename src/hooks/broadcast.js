import { useEffect, useRef, useCallback } from "react";
import { log } from "@/lib";
import { useRefFn } from "@/hooks/common";

/**
 * 创建一个 BroadcastChannel 并监听 message 消息。
 * 会在卸载时自动移除监听并关闭频道。
 * onmessage 会始终调用最新的回调函数。
 */
export const useBroadcastChannel = (name, options = {}) => {
  const {
    onMessage,
    onPostError,
    onMessageError,
    reconnectInterval = 3000, // 自动重连间隔
    heartbeatInterval = 10000, // 心跳频率
  } = options;

  const channelRef = useRef();
  const onMessageRef = useRefFn(onMessage);
  const onMessageErrorRef = useRefFn(onMessageError);
  const onPostErrorRef = useRefFn(onPostError);
  const heartbeatTimerRef = useRef(null);
  const reconnectTimerRef = useRef(null);

  const cleanup = useCallback(() => {
    if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
    if (heartbeatTimerRef.current) clearInterval(heartbeatTimerRef.current);

    if (channelRef.current) {
      channelRef.current.close();
      channelRef.current = null;
    }
  }, []);

  const tryReconnect = useCallback(() => {
    cleanup();
    reconnectTimerRef.current = setTimeout(() => {
      createChannel();
    }, reconnectInterval);
  }, [cleanup, reconnectInterval]);

  const createChannel = useCallback(() => {
    try {
      const channel = new BroadcastChannel(name);

      channel.addEventListener("message", (e) => {
        if (e.data === "__heartbeat__") return;
        onMessageRef(e);
      });

      channel.addEventListener("messageerror", (e) => {
        onMessageErrorRef(e);
        tryReconnect();
      });

      // 启动心跳包
      heartbeatTimerRef.current = setInterval(() => {
        try {
          channel.postMessage("__heartbeat__");
        } catch (err) {
          log.warn("[BroadcastChannel] Heartbeat failed, reconnecting...", err);
          tryReconnect();
        }
      }, heartbeatInterval);

      channelRef.current = channel;
    } catch (e) {
      log.warn("[BroadcastChannel] Initialization failed:", e);
      onPostErrorRef(e);
      tryReconnect();
    }
  }, [name, heartbeatInterval]);

  useEffect(() => {
    createChannel();

    return () => {
      cleanup();
    };
  }, [createChannel, cleanup]);

  const postMessage = useCallback(
    (msg) => {
      try {
        channelRef.current?.postMessage(msg);
      } catch (e) {
        log.warn("[BroadcastChannel] postMessage error, reconnecting...", e);
        onPostErrorRef(e);
        tryReconnect();
      }
    },
    [onPostErrorRef, tryReconnect]
  );

  return {
    name,
    postMessage,
    // channelRef.current 是非响应式的，不建议暴露
    // 如果确实需要内部访问，可以改为 getChannel: () => channelRef.current
  };
};
