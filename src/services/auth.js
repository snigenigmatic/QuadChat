export const login = async (email, password) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Login failed');
    }

    const data = await response.json();
    localStorage.setItem('token', data.data.token);
    return data.data;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
};

export const register = async (email, password, name) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ email, password, name })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.message || 'Registration failed');
    }

    const data = await response.json();
    localStorage.setItem('token', data.data.token);
    return data.data;
  } catch (error) {
    console.error('Registration error:', error);
    throw error;
  }
};

export const logout = () => {
  localStorage.removeItem('token');
};