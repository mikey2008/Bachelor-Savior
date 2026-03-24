'use strict';

const express = require('express');
const db = require('../db/database');
const requireOwnership = require('../middleware/requireOwnership');

const {
  recipeValidator,
  recipeIdValidator,
  recipeUpdateValidator
} = require('../middleware/validators');

const router = express.Router();

// Helper to fetch a recipe row by ID (used by requireOwnership)
function getRecipeById(id) {
  return db.prepare('SELECT * FROM recipes WHERE id = ?').get(id);
}

// GET /api/recipes - list all recipes for the authenticated user
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT id, title, content, created_at FROM recipes WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id);
  res.json({ recipes: rows });
});

// POST /api/recipes - create a new recipe owned by the user
router.post('/', recipeValidator, (req, res) => {
  const { title, content } = req.body;
  const stmt = db.prepare('INSERT INTO recipes (user_id, title, content) VALUES (?, ?, ?)');
  const info = stmt.run(req.user.id, title, content);
  const newRecipe = db.prepare('SELECT id, title, content, created_at FROM recipes WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ recipe: newRecipe });
});

// GET /api/recipes/:id - fetch a single recipe (ownership enforced)
router.get('/:id', recipeIdValidator, requireOwnership(getRecipeById), (req, res) => {
  // req.resource was attached by requireOwnership
  const { id, title, content, created_at } = req.resource;
  res.json({ recipe: { id, title, content, created_at } });
});

// PUT /api/recipes/:id - update a recipe (ownership enforced)
router.put('/:id', recipeUpdateValidator, requireOwnership(getRecipeById), (req, res) => {
  const { title, content } = req.body;
  
  if (!title && !content) {
    return res.status(400).json({ error: 'At least one of title or content must be provided.' });
  }

  const updates = [];
  const params = [];
  
  // Explicitly mapping allowed columns to prevent any dynamic SQL manipulation
  if (title) { updates.push('title = ?'); params.push(title); }
  if (content) { updates.push('content = ?'); params.push(content); }
  
  params.push(req.resource.id);
  const sql = `UPDATE recipes SET ${updates.join(', ')} WHERE id = ?`;
  db.prepare(sql).run(...params);
  
  const updated = db.prepare('SELECT id, title, content, created_at FROM recipes WHERE id = ?').get(req.resource.id);
  res.json({ recipe: updated });
});

// DELETE /api/recipes/:id - delete a recipe (ownership enforced)
router.delete('/:id', recipeIdValidator, requireOwnership(getRecipeById), (req, res) => {
  db.prepare('DELETE FROM recipes WHERE id = ?').run(req.resource.id);
  res.json({ message: 'Recipe deleted.' });
});

module.exports = router;
