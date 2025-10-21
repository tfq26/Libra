<template>
  <div class="grid grid-cols-2 gap-3"> 
    <Button
      v-for="(option, index) in options"
      :key="index"
      :label="typeof option === 'string' ? option : option.label"
      :icon="typeof option === 'object' && option.icon ? `pi ${option.icon}` : null"
      :severity="getButtonSeverity(index)"
      :disabled="disabled"
      @click="handleClick(option)"
      class="p-button-md md:p-button-xl justify-center h-20 md:h-24 text-sm md:text-lg"
    />
  </div>
</template>

<script setup>
import Button from 'primevue/button';

const props = defineProps({
  options: { type: Array, required: true, default: () => [] },
  disabled: { type: Boolean, default: false }
});

const emit = defineEmits(['response']);

function handleClick(option) {
  const responseText = typeof option === 'string' ? option : option.label;
  emit('response', responseText);
}

function getButtonSeverity(index) {
  const severities = ['primary', 'success', 'warning', 'danger'];
  return severities[index % severities.length];
}
</script>