((lox-ts-mode
  (compile-command
   . (concat
      "npm run parse -- " (buffer-file-name)
      " | awk '{sub(/ *\\[.*\\] */, \"\"); print}'"))))
