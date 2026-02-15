<template>
  <Transition name="toast">
    <div v-if="visible" class="toast" :class="type">
      <div class="toast-icon">{{ icon }}</div>
      <div class="toast-message">{{ message }}</div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'success',
  duration: 3000
})

const visible = ref(false)
let timer: number | null = null

const icon = computed(() => {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  }
  return icons[props.type]
})

const show = () => {
  visible.value = true
  
  if (timer) {
    clearTimeout(timer)
  }
  
  timer = window.setTimeout(() => {
    visible.value = false
  }, props.duration)
}

const hide = () => {
  visible.value = false
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
}

watch(() => props.message, () => {
  if (props.message) {
    show()
  }
})

defineExpose({ show, hide })
</script>

<script lang="ts">
import { computed } from 'vue'
export default {
  name: 'Toast'
}
</script>

<style scoped>
.toast {
  position: fixed;
  top: 80px;
  right: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  min-width: 300px;
  max-width: 500px;
}

.toast-icon {
  font-size: 24px;
  font-weight: bold;
  flex-shrink: 0;
}

.toast-message {
  font-size: 14px;
  color: #333;
  flex: 1;
}

.toast.success {
  border-left: 4px solid #4caf50;
}

.toast.success .toast-icon {
  color: #4caf50;
}

.toast.error {
  border-left: 4px solid #f44336;
}

.toast.error .toast-icon {
  color: #f44336;
}

.toast.warning {
  border-left: 4px solid #ff9800;
}

.toast.warning .toast-icon {
  color: #ff9800;
}

.toast.info {
  border-left: 4px solid #2196f3;
}

.toast.info .toast-icon {
  color: #2196f3;
}

/* Transition */
.toast-enter-active {
  animation: toast-in 0.3s ease-out;
}

.toast-leave-active {
  animation: toast-out 0.3s ease-in;
}

@keyframes toast-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes toast-out {
  from {
    transform: translateX(0);
    opacity: 1;
  }
  to {
    transform: translateX(100%);
    opacity: 0;
  }
}
</style>
