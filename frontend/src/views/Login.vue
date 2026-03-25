<template>
  <div class="auth-page">
    <div class="auth-card">
      <h1>{{ isRegisterMode ? 'Create Account' : 'Sign In' }}</h1>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <label>
          Username
          <input v-model.trim="form.username" type="text" autocomplete="username" />
        </label>

        <label v-if="isRegisterMode">
          Full name (optional)
          <input v-model.trim="form.fullName" type="text" autocomplete="name" />
        </label>

        <label v-if="isRegisterMode">
          Email (optional)
          <input v-model.trim="form.email" type="email" autocomplete="email" />
        </label>

        <label>
          Password
          <input v-model="form.password" type="password" autocomplete="current-password" />
        </label>

        <p v-if="isRegisterMode" class="hint">Password must be at least 6 characters.</p>

        <p v-if="error" class="error">{{ error }}</p>
        <p v-if="success" class="success">{{ success }}</p>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Please wait...' : isRegisterMode ? 'Create account' : 'Login' }}
        </button>
      </form>

      <button class="switch-mode" type="button" @click="toggleMode" :disabled="loading">
        {{ isRegisterMode ? 'Back to login' : 'No account? Create one' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import websocket from '@/utils/websocket';

const router = useRouter();
const userStore = useUserStore();

const isRegisterMode = ref(false);
const loading = ref(false);
const error = ref('');
const success = ref('');

const form = reactive({
  username: '',
  password: '',
  email: '',
  fullName: ''
});

const resetMessages = () => {
  error.value = '';
  success.value = '';
};

const toggleMode = () => {
  isRegisterMode.value = !isRegisterMode.value;
  resetMessages();
};

const validate = () => {
  if (!form.username || !form.password) {
    return 'Username and password are required';
  }

  if (isRegisterMode.value && form.password.length < 6) {
    return 'Password must be at least 6 characters';
  }

  return '';
};

const handleSubmit = async () => {
  resetMessages();
  const validationMsg = validate();
  if (validationMsg) {
    error.value = validationMsg;
    return;
  }

  loading.value = true;
  try {
    if (isRegisterMode.value) {
      const result = await userStore.register({
        username: form.username,
        password: form.password,
        email: form.email || undefined,
        fullName: form.fullName || undefined
      });

      if (!result.success) {
        error.value = result.message;
        return;
      }

      success.value = 'Account created. You can now login.';
      isRegisterMode.value = false;
      form.password = '';
      return;
    }

    const loginResult = await userStore.login(form.username, form.password);
    if (!loginResult.success) {
      error.value = loginResult.message;
      return;
    }

    websocket.connect(userStore.token);
    router.push('/');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f4f7ff;
  padding: 24px;
}

.auth-card {
  width: min(420px, 100%);
  background: #ffffff;
  border: 1px solid #e4e8f5;
  border-radius: 12px;
  padding: 24px;
}

h1 {
  margin: 0 0 16px;
  font-size: 24px;
  color: #1f2a44;
}

.auth-form {
  display: grid;
  gap: 12px;
}

label {
  display: grid;
  gap: 6px;
  color: #33415f;
  font-size: 14px;
}

input {
  height: 40px;
  border: 1px solid #cfd8ea;
  border-radius: 8px;
  padding: 0 12px;
  font-size: 14px;
}

button {
  height: 42px;
  border: none;
  border-radius: 8px;
  background: #275efe;
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.switch-mode {
  margin-top: 12px;
  width: 100%;
  background: transparent;
  color: #275efe;
  border: 1px solid #cfd8ea;
}

.error {
  margin: 0;
  color: #c62828;
  font-size: 13px;
}

.success {
  margin: 0;
  color: #2e7d32;
  font-size: 13px;
}

.hint {
  margin: 0;
  color: #60708f;
  font-size: 12px;
}
</style>
