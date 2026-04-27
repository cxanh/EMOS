<template>
  <div class="combo-box" ref="wrapperRef">
    <div class="input-wrapper" :class="{ 'is-focused': isOpen }">
      <input v-model="inputValue" :placeholder="placeholder" @focus="openDropdown" @input="handleInput"
        @keydown.down.prevent="navigateOptions(1)" @keydown.up.prevent="navigateOptions(-1)"
        @keydown.enter.prevent="selectHighlighted" />
      <div class="icons">
        <button v-if="inputValue" type="button" class="btn-clear" @click.stop="clearSelect">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"
            stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <button type="button" class="btn-toggle" @click.stop="toggleDropdown">
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"
            stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
      </div>
    </div>

    <!-- Dropdown menu -->
    <Transition name="fade-down">
      <div v-show="isOpen" class="dropdown-menu">
        <ul v-if="filteredOptions.length > 0" class="options-list">
          <li v-for="(option, index) in filteredOptions" :key="option.value" class="option-item"
            :class="{ 'is-highlighted': index === highlightedIndex, 'is-selected': option.value === modelValue }"
            @mousedown.prevent="selectOption(option)" @mouseenter="highlightedIndex = index">
            <div class="option-label">
              <span>{{ option.label }}</span>
              <small v-if="option.description">{{ option.description }}</small>
            </div>
            <svg v-if="option.value === modelValue" class="check-icon" viewBox="0 0 24 24" width="14" height="14"
              stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </li>
        </ul>
        <div v-else class="empty-state">
          未匹配到预置项，将作为自定义参数
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'

export interface ComboOption {
  value: string
  label: string
  description?: string
}

const props = defineProps<{
  modelValue: string
  options: ComboOption[]
  placeholder?: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const wrapperRef = ref<HTMLElement | null>(null)
const inputValue = ref(props.modelValue)
const isOpen = ref(false)
const highlightedIndex = ref(-1)

// 当外部传入值改变时同步内部值
watch(() => props.modelValue, (newVal) => {
  if (newVal !== inputValue.value) {
    inputValue.value = newVal
  }
})

// 根据输入过滤选项
const filteredOptions = computed(() => {
  if (!inputValue.value) return props.options
  const query = inputValue.value.toLowerCase()
  return props.options.filter(opt =>
    opt.value.toLowerCase().includes(query) ||
    opt.label.toLowerCase().includes(query) ||
    (opt.description && opt.description.toLowerCase().includes(query))
  )
})

// 监听内部输入并发布事件（不限制只能选列表内的）
const handleInput = () => {
  isOpen.value = true
  highlightedIndex.value = -1 // reset highlight
  emit('update:modelValue', inputValue.value)
}

const toggleDropdown = () => {
  isOpen.value = !isOpen.value
}

const openDropdown = () => {
  isOpen.value = true
}

const selectOption = (option: ComboOption) => {
  inputValue.value = option.value
  emit('update:modelValue', option.value)
  isOpen.value = false
}

const clearSelect = () => {
  inputValue.value = ''
  emit('update:modelValue', '')
  // isOpen.value = false
}

// 键盘导航
const navigateOptions = (direction: number) => {
  if (!isOpen.value) {
    isOpen.value = true
    return
  }
  const max = filteredOptions.value.length - 1
  if (max < 0) return
  let next = highlightedIndex.value + direction
  if (next < 0) next = max
  if (next > max) next = 0
  highlightedIndex.value = next
}

const selectHighlighted = () => {
  if (isOpen.value && highlightedIndex.value >= 0) {
    const selected = filteredOptions.value[highlightedIndex.value]
    if (selected) selectOption(selected)
  } else {
    // 允许自定义输入的回车
    isOpen.value = false
  }
}

// 点击外部关闭弹窗
const handleClickOutside = (e: MouseEvent) => {
  if (wrapperRef.value && !wrapperRef.value.contains(e.target as Node)) {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside)
})
onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside)
})
</script>

<style scoped>
.combo-box {
  position: relative;
  width: 100%;
}

.input-wrapper {
  display: flex;
  align-items: center;
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  transition: all 0.2s ease;
  position: relative;
}

.input-wrapper.is-focused,
.input-wrapper:focus-within {
  border-color: #38bdf8;
  background: rgba(15, 23, 42, 0.6);
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.2);
}

.input-wrapper input {
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  padding: 10px 36px 10px 14px;
  background: transparent;
  border: none;
  color: #f8fafc;
  outline: none;
  font-family: inherit;
  font-size: 13px;
}

.icons {
  position: absolute;
  right: 8px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.btn-clear,
.btn-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  border: none;
  color: #64748b;
  cursor: pointer;
  border-radius: 4px;
}

.btn-clear:hover,
.btn-toggle:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #f8fafc;
}

.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 6px;
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
  z-index: 50;
  max-height: 240px;
  overflow-y: auto;
  padding: 4px;
}

.options-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.option-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  border-radius: 6px;
  color: #cbd5e1;
  font-size: 13px;
}

.option-item.is-highlighted {
  background: rgba(255, 255, 255, 0.05);
}

.option-item.is-selected {
  background: rgba(56, 189, 248, 0.15);
  color: #f8fafc;
}

.option-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.option-label small {
  font-size: 11px;
  color: #64748b;
}

.check-icon {
  color: #38bdf8;
}

.empty-state {
  padding: 12px;
  text-align: center;
  font-size: 12px;
  color: #64748b;
}

.fade-down-enter-active,
.fade-down-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.fade-down-enter-from,
.fade-down-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
