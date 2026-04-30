INSERT INTO mark6_results (draw_date, numbers, jackpot_amount, source)
VALUES
  ('2026-04-10', ARRAY[2,6,13,18,31,47], 18000000, 'seed'),
  ('2026-04-14', ARRAY[4,12,19,24,33,41], 19500000, 'seed'),
  ('2026-04-17', ARRAY[1,9,15,22,35,44], 17200000, 'seed'),
  ('2026-04-21', ARRAY[5,11,17,28,32,49], 20100000, 'seed'),
  ('2026-04-24', ARRAY[3,8,16,23,36,45], 18800000, 'seed')
ON CONFLICT DO NOTHING;

INSERT INTO race_results (race_date, race_id, horse_number, horse_name, horse_profile, position, jockey, trainer, source)
VALUES
  ('2026-04-20', 'ST-R3', 1, 'Golden Harbor', 'Front-runner with strong gate speed over sprint distances.', 1, 'K. Teetan', 'A. Cruz', 'seed'),
  ('2026-04-20', 'ST-R3', 4, 'Sky Rocket', 'Late-closing runner that performs well in fast pace races.', 2, 'H. Bowman', 'F. Lor', 'seed'),
  ('2026-04-20', 'ST-R3', 7, 'Night Storm', 'Consistent top-3 finisher with balanced pace profile.', 3, 'Z. Purton', 'D. Hayes', 'seed'),
  ('2026-04-24', 'HV-R5', 2, 'Silver Arrow', 'Sharp recent form and positive jockey synergy.', 1, 'B. Avdulla', 'J. Size', 'seed'),
  ('2026-04-24', 'HV-R5', 5, 'Rapid Crest', 'Reliable mid-pack mover with strong final sectionals.', 2, 'L. Ferraris', 'C. Fownes', 'seed'),
  ('2026-04-24', 'HV-R5', 9, 'Ocean Gift', 'Stamina-oriented horse with stable improvement trend.', 3, 'M. Chadwick', 'P. O''Sullivan', 'seed')
ON CONFLICT DO NOTHING;
