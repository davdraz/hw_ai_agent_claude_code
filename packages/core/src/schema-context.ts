export const PRODUCTS_SCHEMA = `products(
  id                serial primary key,
  name              text,     -- köznapi név
  latin_name        text,
  category          text,     -- szobanövény | kerti | pozsgás | kaktusz | fűszer | fa-cserje | lógó | virágzó
  location          text,     -- beltéri | kültéri | mindkettő
  price             numeric,  -- ár (HUF)
  sale_price        numeric,  -- akciós ár, ha van; egyébként null
  stock             int,      -- raktárkészlet (db)
  light             text,     -- árnyék | alacsony | közepes | erős | direkt nap
  watering          text,     -- ritka | közepes | gyakori | állandóan nedves
  difficulty        text,     -- kezdő | haladó | profi
  current_height_cm int,
  max_height_cm     int,
  current_pot_cm    int,
  pet_safe          boolean,
  kid_safe          boolean,
  air_purifying     boolean,
  rating            numeric,  -- 0-5
  reviews_count     int,
  description       text
)`;
