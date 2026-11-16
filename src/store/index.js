import { createStore } from "vuex";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import axios from "axios";

export default createStore({
  state: {
    conversations: [],
    stompClient: null,
    currentUserId: null,
    token:
      localStorage.getItem("token") || sessionStorage.getItem("token") || "",
    selectedConversation: null,
    newMessageEvent: null,
    newMessageCounter: 0,
    newNotification: null,
    newNotificationCounter: 0,
  },
  mutations: {
    updateConversations(state, message) {
      const convIndex = state.conversations.findIndex(
        (c) => c.conversationId === message.conversationId,
      );
      if (convIndex !== -1) {
        const conv = { ...state.conversations[convIndex] };
        conv.lastMessageContent = message.content;
        conv.lastMessageTime = message.createdAt;
        if (
          !state.selectedConversation ||
          conv.conversationId !== state.selectedConversation.conversationId
        ) {
          conv.unreadCount = (conv.unreadCount || 0) + 1;
          localStorage.setItem(
            `unreadCount_${conv.conversationId}`,
            conv.unreadCount,
          );
        }
        state.conversations.splice(convIndex, 1, conv);
      }
    },
    setStompClient(state, client) {
      state.stompClient = client;
    },
    setToken(state, token) {
      state.token = token;
    },
    setCurrentUserId(state, userId) {
      state.currentUserId = userId;
    },
    setConversations(state, conversations) {
      state.conversations = conversations;
    },
    clearUnreadCount(state, conversationId) {
      const conv = state.conversations.find(
        (c) => c.conversationId === conversationId,
      );
      if (conv) {
        conv.unreadCount = 0;
        localStorage.removeItem(`unreadCount_${conversationId}`);
      }
    },
    setSelectedConversation(state, conversation) {
      state.selectedConversation = conversation;
    },
    setNewMessageEvent(state, message) {
      state.newMessageEvent = message;
      state.newMessageCounter = (state.newMessageCounter || 0) + 1;
    },
    setNewNotification(state, notification) {
      state.newNotification = notification;
      state.newNotificationCounter = (state.newNotificationCounter || 0) + 1;
      localStorage.setItem("hasNewNotification", "true");
    },
    clearNotificationDot(state) {
      state.newNotificationCounter = 0;
      localStorage.setItem("clearNotificationDot", Date.now().toString());
    },
  },
  actions: {
    async initWebSocket({ state, commit }) {
      return new Promise((resolve, reject) => {
        const client = new Client({
          brokerURL: `http://localhost:8080/ws`,
          connectHeaders: { Authorization: `Bearer ${state.token}` },
          webSocketFactory: () => new SockJS(`http://localhost:8080/ws`),
          onConnect: () => {
            client.subscribe(
              `/queue/private/${state.currentUserId}`,
              (message) => {
                const parsedMessage = JSON.parse(message.body);

                commit("updateConversations", parsedMessage);
                commit("setNewMessageEvent", parsedMessage);
              },
            );

            // 订阅通知频道
            client.subscribe(
              `/queue/notification/${state.currentUserId}`,
              (message) => {
                const notification = JSON.parse(message.body);
                commit("setNewNotification", notification);
              },
            );

            commit("setStompClient", client);
            resolve();
          },
          onStompError: (frame) => {
            console.error("STOMP error:", frame);
            reject(frame);
          },
          onDisconnect: () => {
            console.log("STOMP disconnected");
          },
        });
        client.activate();
      });
    },
    async fetchConversations({ commit, state }) {
      try {
        const response = await axios.get(
          `http://localhost:8080/user/chat/conversations`,
          {
            headers: { Authorization: `Bearer ${state.token}` },
          },
        );

        if (response.data && response.data.data) {
          const newConversations = response.data.data.map((conv) => {
            const existingConv = state.conversations.find(
              (c) => c.conversationId === conv.conversationId,
            );
            const unreadCount = existingConv ? existingConv.unreadCount : 0;
            return {
              ...conv,
              unreadCount: unreadCount,
              unreadCount1: 0,
            };
          });
          commit("setConversations", newConversations);
        }
      } catch (error) {
        console.warn("fetchConversations failed:", error.message);
      }
    },
  },
});
