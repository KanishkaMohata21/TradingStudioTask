import express from 'express';
import mongoose from 'mongoose';
import Strategy from '../models/Strategy';
import { runSimulation } from '../services/simulation';
import { getAvailableSymbols } from '../services/financeApi';

const router = express.Router();

// Get all strategies
router.get('/', async (req, res) => {
  try {
    const strategies = await Strategy.find().sort({ updatedAt: -1 });
    res.status(200).json({ strategies });
  } catch (error) {
    console.error('Error fetching strategies:', error);
    res.status(500).json({ message: 'Error fetching strategies' });
  }
});

// Get a strategy by ID
router.get('/:id', async (req, res) => {
  try {
    const strategy = await Strategy.findById(req.params.id);
    
    if (!strategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }
    
    res.status(200).json({ strategy });
  } catch (error) {
    console.error('Error fetching strategy:', error);
    res.status(500).json({ message: 'Error fetching strategy' });
  }
});

// Create a new strategy
router.post('/', async (req, res) => {
  try {
    const newStrategy = new Strategy(req.body);
    await newStrategy.save();
    
    res.status(201).json({ strategy: newStrategy });
  } catch (error) {
    console.error('Error creating strategy:', error);
    res.status(500).json({ message: 'Error creating strategy' });
  }
});

// Update a strategy
router.put('/:id', async (req, res) => {
  try {
    const strategy = await Strategy.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!strategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }
    
    res.status(200).json({ strategy });
  } catch (error) {
    console.error('Error updating strategy:', error);
    res.status(500).json({ message: 'Error updating strategy' });
  }
});

// Delete a strategy
router.delete('/:id', async (req, res) => {
  try {
    const strategy = await Strategy.findByIdAndDelete(req.params.id);
    
    if (!strategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }
    
    res.status(200).json({ message: 'Strategy deleted successfully' });
  } catch (error) {
    console.error('Error deleting strategy:', error);
    res.status(500).json({ message: 'Error deleting strategy' });
  }
});

// Start a simulation
router.post('/:id/simulate', async (req, res) => {
  try {
    const strategy = await Strategy.findById(req.params.id);
    
    if (!strategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }
    
    // Update status to in_progress
    strategy.status = 'in_progress';
    await strategy.save();
    
    // Run the simulation in the background
    runSimulation(strategy.toObject())
      .then(async (results) => {
        // Update the strategy with simulation results
        strategy.results = results;
        strategy.status = 'completed';
        await strategy.save();
      })
      .catch(async (error) => {
        console.error('Simulation error:', error);
        // Update status back to saved in case of error
        strategy.status = 'saved';
        await strategy.save();
      });
    
    res.status(202).json({
      message: 'Simulation started',
      strategyId: strategy._id
    });
  } catch (error) {
    console.error('Error starting simulation:', error);
    res.status(500).json({ message: 'Error starting simulation' });
  }
});

// Get simulation results
router.get('/:id/result', async (req, res) => {
  try {
    const strategy = await Strategy.findById(req.params.id);
    
    if (!strategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }
    
    if (strategy.status === 'in_progress') {
      return res.status(202).json({
        message: 'Simulation in progress',
        status: 'in_progress'
      });
    }
    
    if (strategy.status === 'saved' || !strategy.results) {
      return res.status(404).json({
        message: 'No simulation results found for this strategy',
        status: 'saved'
      });
    }
    
    res.status(200).json({
      results: strategy.results,
      status: strategy.status
    });
  } catch (error) {
    console.error('Error fetching simulation results:', error);
    res.status(500).json({ message: 'Error fetching simulation results' });
  }
});

// Get available symbols
router.get('/symbols/available', (req, res) => {
  try {
    const symbols = getAvailableSymbols();
    res.status(200).json({ symbols });
  } catch (error) {
    console.error('Error fetching symbols:', error);
    res.status(500).json({ message: 'Error fetching symbols' });
  }
});

// Edit a strategy (named route)
router.put('/edit/:id', async (req, res) => {
  console.log("hit")
  try {
    const updatedStrategy = await Strategy.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updatedStrategy) {
      return res.status(404).json({ message: 'Strategy not found' });
    }

    res.status(200).json({ strategy: updatedStrategy });
  } catch (error) {
    console.error('Error editing strategy:', error);
    res.status(500).json({ message: 'Error editing strategy' });
  }
});

router.post('/copy/:id', async (req, res) => {
  console.log("Hit")
  try {
    const original = await Strategy.findById(req.params.id); 

    if (!original) {
      return res.status(404).json({ message: 'Original strategy not found' });
    }

    const copiedData = original.toObject();
    delete copiedData._id;
    delete copiedData.createdAt;
    delete copiedData.updatedAt;

    copiedData.name = `${copiedData.name} (Copy)`; 
    copiedData.status = 'saved';
    copiedData.results = null;

    const newStrategy = new Strategy(copiedData);
    await newStrategy.save();

    res.status(201).json({ strategy: newStrategy });
  } catch (error) {
    console.error('Error copying strategy:', error);
    res.status(500).json({ message: 'Error copying strategy' });
  }
});



export default router;