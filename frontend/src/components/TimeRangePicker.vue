<template>
  <div class="time-range-picker">
    <div class="quick-select">
      <button
        v-for="option in quickOptions"
        :key="option.value"
        :class="{ active: selectedQuick === option.value }"
        @click="selectQuick(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
    
    <div class="custom-range">
      <div class="range-input">
        <label>开始时间:</label>
        <input
          type="datetime-local"
          v-model="customStart"
          @change="handleCustomChange"
        />
      </div>
      
      <div class="range-input">
        <label>结束时间:</label>
        <input
          type="datetime-local"
          v-model="customEnd"
          @change="handleCustomChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{
  (e: 'change', value: { startTime: string; endTime: string; label: string }): void;
}>();

const quickOptions = [
  { label: '最近1小时', value: '1h' },
  { label: '最近6小时', value: '6h' },
  { label: '最近24小时', value: '24h' },
  { label: '最近7天', value: '7d' },
  { label: '最近30天', value: '30d' }
];

const selectedQuick = ref('1h');
const customStart = ref('');
const customEnd = ref('');

const selectQuick = (value: string) => {
  selectedQuick.value = value;
  
  const now = new Date();
  const endTime = now.toISOString();
  let startTime: string;
  
  switch (value) {
    case '1h':
      startTime = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
      break;
    case '6h':
      startTime = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
      break;
    case '24h':
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      break;
    case '7d':
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      break;
    case '30d':
      startTime = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      break;
    default:
      startTime = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
  }
  
  emit('change', {
    startTime,
    endTime,
    label: quickOptions.find(o => o.value === value)?.label || ''
  });
};

const handleCustomChange = () => {
  if (customStart.value && customEnd.value) {
    selectedQuick.value = '';
    emit('change', {
      startTime: new Date(customStart.value).toISOString(),
      endTime: new Date(customEnd.value).toISOString(),
      label: '自定义时间'
    });
  }
};

// 初始化选择最近1小时
selectQuick('1h');
</script>

<style scoped>
.time-range-picker {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.quick-select {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.quick-select button {
  padding: 8px 16px;
  border: 1px solid #ddd;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
}

.quick-select button:hover {
  border-color: #667eea;
  color: #667eea;
}

.quick-select button.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

.custom-range {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 15px;
  padding-top: 15px;
  border-top: 1px solid #f0f0f0;
}

.range-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.range-input label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.range-input input {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.range-input input:focus {
  outline: none;
  border-color: #667eea;
}

@media (max-width: 768px) {
  .quick-select {
    flex-direction: column;
  }
  
  .quick-select button {
    width: 100%;
  }
  
  .custom-range {
    grid-template-columns: 1fr;
  }
}
</style>
