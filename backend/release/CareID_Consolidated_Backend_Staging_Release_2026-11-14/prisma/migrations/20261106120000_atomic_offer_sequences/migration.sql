-- Atomic PostgreSQL sequences for Treatment Offer and Financing Offer numbering

CREATE SEQUENCE IF NOT EXISTS treatment_offer_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS financing_offer_seq START WITH 1 INCREMENT BY 1;

DO $$
DECLARE
  max_to_seq integer;
  max_fo_seq integer;
BEGIN
  -- Synchronize treatment_offer_seq with existing records
  SELECT COALESCE(MAX(NULLIF(SUBSTRING(offer_number FROM 'TO-[0-9]{4}-([0-9]+)'), '')::integer), 0)
  INTO max_to_seq
  FROM treatment_offers;

  IF max_to_seq > 0 THEN
    PERFORM setval('treatment_offer_seq', max_to_seq, true);
  END IF;

  -- Synchronize financing_offer_seq with existing records
  SELECT COALESCE(MAX(NULLIF(SUBSTRING(offer_number FROM 'FO-[0-9]{4}-([0-9]+)'), '')::integer), 0)
  INTO max_fo_seq
  FROM financing_offers;

  IF max_fo_seq > 0 THEN
    PERFORM setval('financing_offer_seq', max_fo_seq, true);
  END IF;
END $$;

