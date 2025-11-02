<template>
  <div class="mx-auto flex flex-nowrap items-center gap-3 overflow-x-auto px-1 sm:justify-center"> 
    <Button
      v-for="(option, index) in options"
      :key="index"
      :label="typeof option === 'string' ? option : option.label"
      :icon="typeof option === 'object' && option.icon ? `pi ${option.icon}` : null"
      :disabled="disabled"
      @click="handleClick(option)"
      :class="buttonClass(index)"
    />
  </div>
</template>

<script setup>
import Button from 'primevue/button';

const props = defineProps({
  options: { type: Array, required: true, default: () => [] },
  disabled: { type: Boolean, default: false }
});

const emit = defineEmits(['response', 'switch-to-text']);

const GLASS_BUTTON_BASE = 'relative inline-flex h-12 sm:h-14 min-w-[8.5rem] items-center justify-center rounded-2xl border px-6 text-sm sm:text-base font-semibold tracking-[0.15em] transition-all duration-200 backdrop-blur-xl shadow-sm hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-60';

const ACCENT_CLASSES = [
  '!border-sky-200/60 bg-sky-100/30 text-sky-700 hover:!border-sky-200/80 hover:bg-sky-100/40 focus-visible:ring-sky-200/60 dark:!border-sky-400/40 dark:bg-sky-400/10 dark:text-sky-100',
  '!border-emerald-200/60 bg-emerald-100/30 text-emerald-700 hover:!border-emerald-200/80 hover:bg-emerald-100/40 focus-visible:ring-emerald-200/60 dark:!border-emerald-400/40 dark:bg-emerald-400/10 dark:text-emerald-100',
  '!border-amber-200/60 bg-amber-100/30 text-amber-700 hover:!border-amber-200/80 hover:bg-amber-100/40 focus-visible:ring-amber-200/60 dark:!border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100',
  '!border-fuchsia-200/60 bg-fuchsia-100/30 text-fuchsia-700 hover:!border-fuchsia-200/80 hover:bg-fuchsia-100/40 focus-visible:ring-fuchsia-200/60 dark:!border-fuchsia-400/40 dark:bg-fuchsia-400/10 dark:text-fuchsia-100'
];

const buttonClass = (index) => [
  GLASS_BUTTON_BASE,
  ACCENT_CLASSES[index % ACCENT_CLASSES.length]
];

// Check if option text indicates "Other" or similar
function isOtherOption(text) {
  const normalizedText = text.toLowerCase().trim();
  return normalizedText === 'other' || 
         normalizedText === 'other (please specify)' ||
         normalizedText === 'something else' ||
         normalizedText === 'custom' ||
         normalizedText === 'specify' ||
         normalizedText.includes('type your own') ||
         normalizedText.includes('enter custom');
}

function handleClick(option) {
  const responseText = typeof option === 'string' ? option : option.label;
  
  // If this is an "Other" option, switch to text input instead
  if (isOtherOption(responseText)) {
    emit('switch-to-text');
  } else {
    emit('response', responseText);
  }
}
</script>