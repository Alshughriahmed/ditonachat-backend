#!/bin/bash

echo "🚀 بدء تشغيل مشروع ditonachat-backend ..."

# 1. تثبيت الحزم
if [ ! -d "node_modules" ]; then
  echo "📦 تثبيت الحزم لأول مرة..."
  npm install
else
  echo "✅ الحزم موجودة بالفعل."
fi

# 2. التأكد من وجود .env
if [ ! -f ".env" ]; then
  echo "⚠️ لا يوجد ملف .env. يتم إنشاؤه تلقائيًا..."
  echo "PORT=3001" > .env
  echo "✅ تم إنشاء .env بداخل المشروع."
else
  echo "✅ ملف .env موجود."
fi

# 3. التأكد أن المجلد مشروع git
if [ ! -d ".git" ]; then
  echo "⚠️ ليس مشروع git، جاري التهيئة..."
  git init
  git branch -M main
  echo "✅ تم تهيئة Git."
else
  echo "✅ المشروع بالفعل git repo."
fi

# 4. إضافة كل شيء للـ commit
echo "📂 إضافة جميع التعديلات..."
git add .

# 5. إنشاء commit تلقائي
COMMIT_MSG="🛠️ تحديث تلقائي بتاريخ $(date)"
git commit -m "$COMMIT_MSG"

# 6. دفع التغييرات إن كان remote موجود
if git remote | grep origin > /dev/null; then
  echo "🚀 جاري الدفع إلى GitHub..."
  git push origin main
else
  echo "ℹ️ لا يوجد remote مرتبط، تخطينا خطوة الدفع."
fi

# 7. تشغيل الخادم
echo "🚦 تشغيل الخادم..."
npx ts-node-dev --respawn --transpile-only src/server.ts
