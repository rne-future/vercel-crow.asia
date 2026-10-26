DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'pdf_r2_keys'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'pdf_keys'
  ) THEN
    ALTER TABLE "books" RENAME COLUMN "pdf_r2_keys" TO "pdf_keys";
  ELSIF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'books' AND column_name = 'pdf_keys'
  ) THEN
    RAISE EXCEPTION 'books has neither pdf_r2_keys nor pdf_keys';
  END IF;
END $$;
