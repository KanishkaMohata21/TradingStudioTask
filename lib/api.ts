import axios from 'axios';
import { Strategy, SimulationResults } from '@/types';

const API_URL = 'http://localhost:5000/api';

// Create a new strategy
export async function createStrategy(strategy: Omit<Strategy, '_id'>) {
  try {
    const response = await axios.post(`${API_URL}/strategy`, strategy);
    return response.data.strategy;
  } catch (error) {
    console.error('Error creating strategy:', error);
    throw error;
  }
}

// Get all strategies
export async function getStrategies() {
  try {
    const response = await axios.get(`${API_URL}/strategy`);
    return response.data.strategies;
  } catch (error) {
    console.error('Error fetching strategies:', error);
    throw error;
  }
}

// Get a strategy by ID
export async function getStrategy(id: string) {
  try {
    const response = await axios.get(`${API_URL}/strategy/${id}`);
    return response.data.strategy;
  } catch (error) {
    console.error('Error fetching strategy:', error);
    throw error;
  }
}

// Start a simulation
export async function startSimulation(id: string) {
  try {
    const response = await axios.post(`${API_URL}/strategy/${id}/simulate`);
    return response.data;
  } catch (error) {
    console.error('Error starting simulation:', error);
    throw error;
  }
}

// Get simulation results
export async function getSimulationResults(id: string) {
  try {
    const response = await axios.get(`${API_URL}/strategy/${id}/result`);
    return response.data;
  } catch (error) {
    console.error('Error fetching simulation results:', error);
    throw error;
  }
}

// Get available symbols
export async function getAvailableSymbols() {
  try {
    const response = await axios.get(`${API_URL}/strategy/symbols/available`);
    return response.data.symbols;
  } catch (error) {
    console.error('Error fetching symbols:', error);
    return [];
  }
}

// Update a strategy
export async function updateStrategy(id: string, strategy: Partial<Strategy>) {
  try {
    const response = await axios.put(`${API_URL}/strategy/${id}`, strategy);
    return response.data.strategy;
  } catch (error) {
    console.error('Error updating strategy:', error);
    throw error;
  }
}

// Delete a strategy
export async function deleteStrategy(id: string) {
  try {
    await axios.delete(`${API_URL}/strategy/${id}`);
    return true;
  } catch (error) {
    console.error('Error deleting strategy:', error);
    throw error;
  }
}

export const copyStrategy = async (id) => {
  const response = await fetch(`${API_URL}/strategy/copy/${id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  
  if (!response.ok) {
    throw new Error('Failed to copy strategy');
  }
  
  return response.json();
};