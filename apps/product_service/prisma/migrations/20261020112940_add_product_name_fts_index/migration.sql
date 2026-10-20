-- Full-text search index on product name
CREATE INDEX "Product_name_fts_idx" ON "Product" USING GIN (to_tsvector('english', name));
