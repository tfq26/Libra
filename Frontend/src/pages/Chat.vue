<template>
  <div class="flex font-sans overflow-hidden">
    <main class="flex-grow flex flex-col p-2 shadow-xl"> 
      
      <header class="mb-4 flex items-center flex-shrink-0 dark:text-sunset-300 justify-center">
        <div>
          <h1 class="text-3xl font-bold text-gray-800 dark:text-sunset-200 truncate text-center">{{ chatTitle }}</h1>
          <p v-if="chatSubtitle" class="text-gray-500 mt-1 dark:text-sunset-300 text-center">{{ chatSubtitle }}</p>
        </div>
      </header>
      
      <MessageList
        ref="messageListComp"
        :messages="filteredMessages"
        :is-loading="isLoadingChat"
      />

      <ErrorDisplay 
        v-if="errorMessage"
        :message="errorMessage"
        @dismiss="errorMessage = null"
      />

      <div class="mt-2 flex-shrink-0">
        <div v-if="inputMode === 'buttons' && actionOptions.length > 0 && !isLoadingChat" class="flex items-end space-x-2">
          <ActionButtons class="flex-grow" :options="actionOptions" @response="handleButtonResponse" />
          
          <button @click="inputMode = 'text'" class="p-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-lg transition" title="Type a custom message">
            ...
          </button>
        </div>
        
        <MessageInput 
          v-else
          v-model="currentPrompt"
          :is-loading="isLoadingChat"
          :placeholder="isChatting ? 'Type your message...' : 'Describe your issue to begin.'"
          @send="handleTextInputSend"
        />
      </div>
    </main>
  </div>
</template>
  
  <script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router'; // Import useRoute and useRouter
import { sendChatMessage, loadConversation } from '../functions/chat-api.js'; // Make sure to import loadConversation

// Import all the necessary components
import MessageList from '../components/chat/MessageList.vue';
import MessageInput from '../components/chat/MessageInput.vue';
import ErrorDisplay from '../components/ErrorDisplay.vue';
import ActionButtons from '../components/chat/ActionButtons.vue'; // New import

// --- State for a single chat session ---
const messages = ref([]);
const currentConversationId = ref(null);
const currentPrompt = ref('');
const isLoadingChat = ref(false);
const chatTitle = ref('');
const chatSubtitle = ref('');
const messageListComp = ref(null);
const errorMessage = ref(null);

// NEW: State for managing the input mode and button options
const inputMode = ref('text'); // 'text' or 'buttons'
const actionOptions = ref([]);

const route = useRoute(); // Access route information
const router = useRouter(); // For navigation

const isChatting = computed(() => messages.value.length > 0);
const filteredMessages = computed(() => messages.value.filter(msg => msg.role !== 'system'));
 
  async function scrollToBottom() {
    await nextTick();
    const container = messageListComp.value?.$el.querySelector('#messages-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }

  // --- NEW: Function to load an existing chat ---
async function loadChatHistory(id) {
  isLoadingChat.value = true;
  errorMessage.value = null;
  try {
    const conversation = await loadConversation(id);
    messages.value = conversation.messages || [];
    chatTitle.value = conversation.title;
    chatSubtitle.value = `Conversation started on ${new Date(conversation.createdAt).toLocaleDateString()}`;
    currentConversationId.value = conversation.id;
    
    // Check the last message from the assistant to restore buttons
    const lastMessage = messages.value[messages.value.length - 1];
    if(lastMessage.role === 'assistant' && lastMessage.options) {
      actionOptions.value = lastMessage.options;
      inputMode.value = 'buttons';
    } else {
      inputMode.value = 'text';
    }

  } catch (error) {
    console.error("Failed to load conversation:", error);
    errorMessage.value = "Could not load the requested chat. It might not exist.";
    // Fallback to a new chat
    startNewChat();
  } finally {
    isLoadingChat.value = false;
    await scrollToBottom();
  }
}
  
function startNewChat() {
  currentConversationId.value = null;
  messages.value = [];
  currentPrompt.value = '';
  errorMessage.value = null;
  inputMode.value = 'text';
  actionOptions.value = [];
  chatTitle.value = "New Chat";
  chatSubtitle.value = "Describe your issue to begin.";
  // If the user was on a specific chat URL, redirect them to the clean /chat URL
  if (route.params.id) {
    router.push('/chat');
  }
  nextTick(() => document.querySelector('input')?.focus());
}

// NEW: Handles when a user clicks an action button
async function handleButtonResponse(responseText) {
  // Add the button's text to the chat log
  messages.value.push({ role: 'user', content: responseText });
  await scrollToBottom();
  // Send the button's text as the new prompt
  await sendMessage(responseText);
}

// NEW: Handles when the user sends a message via the text input
async function handleTextInputSend() {
    await sendMessage(currentPrompt.value);
    currentPrompt.value = ''; // Clear the input field
}

// MODIFIED: sendMessage now accepts the prompt as an argument
async function sendMessage(prompt) {
  const promptText = prompt.trim();
  if (!promptText || isLoadingChat.value) return;

  errorMessage.value = null;
  isLoadingChat.value = true;
  actionOptions.value = []; // Clear old buttons while waiting for new ones
  
  if (currentConversationId.value === null) {
    chatTitle.value = promptText.substring(0, 30) + '...';
    chatSubtitle.value = '';
  }
  
  // Add user message if it's not already in the list (for button clicks)
  if (messages.value[messages.value.length - 1]?.content !== promptText) {
    messages.value.push({ role: 'user', content: promptText });
  }

  await scrollToBottom();

  try {
    const data = await sendChatMessage(promptText, currentConversationId.value);
    
    // The API now returns a response with dynamic options
    messages.value.push({ role: 'assistant', content: data.response });
    actionOptions.value = data.options; // Store the new button options
    inputMode.value = 'buttons'; // Switch to button mode

    // NEW: If the conversation is done, set a flag in the database
    if (data.isDone) {
            inputMode.value = 'text'; // Disable all inputs
            actionOptions.value = [];
            
            // Wait 3 seconds, then navigate to the dashboard
            setTimeout(() => {
                router.push('/dashboard'); // Make sure you have a '/dashboard' route
            }, 3000);
        }

    if (!currentConversationId.value) {
      currentConversationId.value = data.conversationId;
    }

  } catch (error) {
    console.error("Error sending message:", error);
    errorMessage.value = error.message;
    inputMode.value = 'text'; // Revert to text mode on error
    messages.value.pop();
  } finally {
    isLoadingChat.value = false;
    scrollToBottom();
  }
}

// --- MODIFIED: onMounted logic ---
onMounted(() => {
  const chatId = route.params.id;
  if (chatId) {
    // If an ID is in the URL, load that chat
    loadChatHistory(chatId);
  } else {
    // Otherwise, start a fresh chat
    startNewChat();
  }
});
</script>