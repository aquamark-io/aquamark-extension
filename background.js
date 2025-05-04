import { watermarkPDF } from './watermark.js';
import { createClient } from './supabase.umd.js';
import { PDFDocument, rgb, degrees } from './pdf-lib.min.js';

const SUPABASE_URL = 'https://dvzmnikrvkvgragzhrof.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2em1uaWtydmt2Z3JhZ3pocm9mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5Njg5NzUsImV4cCI6MjA1OTU0NDk3NX0.FaHsjIRNlgf6YWbe5foz0kJFtCO4FuVFo7KVcfhKPEk';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === "watermarkPDF") {
    console.log("Triggered watermarking task...");
  }
});
