-- Live Playtomic ratings for every league player (Richie, 16 Sep 2026:
-- "show league players current Playtomic rating beside their names on the leagues").
-- Written by scripts/refresh_league_ratings.py from W7's venue player list.
-- 145 teams change; players not found on Playtomic keep the rating they had.

update public.box_teams set r1 = 5.11, r2 = 4.2, updated_at = now() where id = 'ab14a51e-cabd-4b39-af1d-621dc33f3fa7';  -- Peter Finnegan & Christopher Byrne
update public.box_teams set r1 = 4.58, r2 = 4.19, updated_at = now() where id = 'fbca6b95-eef1-4f09-9aab-e71eab286867';  -- Shane Donohoe & Dylan Orr
update public.box_teams set r1 = 4.6, r2 = 4.38, updated_at = now() where id = '177b8e4a-4b3c-448a-9e36-17a8c484c0e1';  -- Davy O'Sullivan & David Hennebry
update public.box_teams set r1 = 2.95, r2 = 4.45, updated_at = now() where id = '8da91d73-ebe1-4759-a2db-bde5ee9aa17c';  -- J.P. Comerford & Conor Ruttledge
update public.box_teams set r1 = 3.68, r2 = 3.77, updated_at = now() where id = '5abe22c2-fb72-41f9-a947-ef6e3df38652';  -- Tomas Morrissey & Brian Cornyn
update public.box_teams set r1 = 3.8, r2 = 3.41, updated_at = now() where id = '01d12013-8ff4-40f2-a9c2-bddd3b7b3321';  -- Dean Noble & Chris Ffrench
update public.box_teams set r2 = 4.28, updated_at = now() where id = '8879ae3e-50ef-492a-a272-0481b2f1c9a5';  -- David Deady & Rob Lucy
update public.box_teams set r1 = 3.14, updated_at = now() where id = 'd253fd66-036b-4f85-98f8-9d284cc5ce9e';  -- James Connolly & Michael Connolly
update public.box_teams set r1 = 3.43, r2 = 3.25, updated_at = now() where id = '581cf5ea-86e1-4647-8d1f-89fe866c4f35';  -- Mike Shanahan & Greg Shine
update public.box_teams set r1 = 2.93, r2 = 3.91, updated_at = now() where id = 'd5a59f5c-e755-4a6e-ac9a-6b952e3427b1';  -- Antonio Loboschi & Sahil Kaistha
update public.box_teams set r1 = 3.64, r2 = 2.9, updated_at = now() where id = 'd9959969-a05d-4012-a8b7-9e3c7faafa79';  -- Matthew & Nathan Condell
update public.box_teams set r1 = 3.64, updated_at = now() where id = 'efc329f0-e030-45ab-bdef-21da5a83c8d8';  -- George Huckstepp & Jordan Lyner
update public.box_teams set r1 = 3.22, r2 = 3.18, updated_at = now() where id = '43ebfa55-ac0b-4432-aded-e693cdf526a7';  -- Andy Earls & Robert Keogh
update public.box_teams set r1 = 2.33, r2 = 3.34, updated_at = now() where id = '3fe642d5-b451-4e60-9eaa-f4e501572bba';  -- Sean Leonard & Dylan Frazer
update public.box_teams set r2 = 1.49, updated_at = now() where id = '41155660-fb3b-477e-91bb-8ab5e4917352';  -- Ingvard Hanssen & Oisin Breen
update public.box_teams set r1 = 1.37, updated_at = now() where id = 'e4afda1e-a15d-44ce-a352-4123c9f08af0';  -- Ciara Kavanagh & Rory Fahey
update public.box_teams set r1 = 2.55, updated_at = now() where id = 'f06a8929-e6b3-41d0-a7d1-e65ed7586edd';  -- Ronel Pickford & Dawn B
update public.box_teams set r1 = 2.05, updated_at = now() where id = '0a1fd152-be1d-46f7-abca-00d33ec4d2cd';  -- Desmond Martin & Dave Smyth
update public.box_teams set r1 = 2.9, r2 = 2.28, updated_at = now() where id = '545ba52c-9294-416e-befd-74de53741102';  -- Shane Devlin & Karl Earls
update public.box_teams set r1 = 2.5, r2 = 2.77, updated_at = now() where id = 'bfad7e03-880a-4925-bc61-c9a3ece953a8';  -- Kayleigh Sullivan & Leanne S
update public.box_teams set r1 = 2.49, r2 = 2.28, updated_at = now() where id = '2d92946a-ecfc-4d9c-ade8-ef39b19da6a5';  -- Shaun Humby & Thomas McKeon
update public.box_teams set r2 = 2.64, updated_at = now() where id = '85744a36-8a06-4691-9bf2-059ea4c673f7';  -- Oussama Kenouche & Jack Colaluca
update public.box_teams set r1 = 2.45, r2 = 2.47, updated_at = now() where id = '72cf329e-6e71-4847-b669-47a3684f82ff';  -- Tom Maguire & Brian O'Sullivan
update public.box_teams set r1 = 2.57, r2 = 2.4, updated_at = now() where id = '844ad70d-d335-4c7e-a8a7-675c2a874294';  -- Lee Fitzpatrick & Mo Dunne
update public.box_teams set r1 = 2.39, r2 = 2.14, updated_at = now() where id = '11336440-60a3-42f6-b5ce-98261ccd44fe';  -- Mark Banim & Anton Burihhin
update public.box_teams set r1 = 2.8, r2 = 1.57, updated_at = now() where id = 'f257fcbf-2ea4-426f-8559-47a57fead885';  -- Cillian Williams & Ava Williams
update public.box_teams set r1 = 1.76, r2 = 2.37, updated_at = now() where id = '8b612fd3-54b1-47fa-80ad-91081ff7b9f5';  -- Aisling O'Brien & Patrick Kennelly
update public.box_teams set r1 = 2.67, updated_at = now() where id = '286a21f9-7f5f-4f41-b894-25e7b14a895b';  -- Charles Lee & Cami Ammirevole
update public.box_teams set r1 = 2.24, updated_at = now() where id = 'b8a0db17-e2a6-4420-b11d-7ed18b47f78b';  -- Gabriel Uribe & Aron Souto
update public.box_teams set r1 = 2.2, r2 = 2.25, updated_at = now() where id = '7339af69-accf-4a93-9e3d-883f87bbdb91';  -- John D & Sam Harte
update public.box_teams set r1 = 2.58, r2 = 2.14, updated_at = now() where id = '228808ac-cf1a-4230-bd18-6454e8cfc810';  -- Kieran Fraser & Ana J
update public.box_teams set r1 = 1.93, r2 = 1.34, updated_at = now() where id = '8b720e09-2851-4578-8180-e0525769b0eb';  -- Fionn Lang & Anthea Lang
update public.box_teams set r1 = 2.46, r2 = 2.45, updated_at = now() where id = '63a580ff-d835-4c49-98bf-2f5726b32dab';  -- Eamonn O'Hanrahan & Liam Finn
update public.box_teams set r1 = 2.78, r2 = 1.8, updated_at = now() where id = '51aeac8d-30de-4778-8f55-4b0a002b3f35';  -- Callum Smale & Ryan Tolan
update public.box_teams set r1 = 2.5, r2 = 3.28, updated_at = now() where id = '5ae4379a-cc75-45f6-b0b7-a3620ba393bd';  -- Karol Stankiewicz & Sath
update public.box_teams set r1 = 2.01, r2 = 1.85, updated_at = now() where id = '13a0b102-1090-457e-aafb-7792314d30e8';  -- David O Neill & John O Neill
update public.box_teams set r1 = 1.6, r2 = 0.78, updated_at = now() where id = '0ba19a8d-1228-4346-8f86-30601598d69d';  -- Keefe Lang & Chris Lang
update public.box_teams set r1 = 1.71, r2 = 2.6, updated_at = now() where id = '494ac9e8-0b64-43c5-bd57-1e3184df1fb4';  -- Lorraine Gallagher & Tina Meehan
update public.box_teams set r1 = 2.39, r2 = 1.84, updated_at = now() where id = '1a41e420-cee5-42f4-82d7-7ac14c1a8f44';  -- Peter Dunne & Lillian Carthy
update public.box_teams set r1 = 2.12, r2 = 1.41, updated_at = now() where id = '1aaf5be2-e799-4768-a0be-7cd6e2db402a';  -- Kieran Fitzpatrick & Stephen Fitzpatrick
update public.box_teams set r1 = 1.56, updated_at = now() where id = '71a256f5-86f2-4566-8e8d-d18a4f6bbd4b';  -- Mark Tindale & Mark Williams
update public.box_teams set r1 = 1.56, r2 = 1.79, updated_at = now() where id = '1cea100b-17d0-4e38-8ad2-8d65aa0a012c';  -- Tom Foley & Fernando Souza
update public.box_teams set r1 = 2.29, r2 = 1.02, updated_at = now() where id = '5ec4d239-104c-4710-b50e-1b9bc563cad7';  -- Toby Wuyts & Jack Dunn
update public.box_teams set r1 = 2.19, r2 = 0.98, updated_at = now() where id = '0ac88cd0-a52f-4581-af02-d0df6931cf6e';  -- Kylie Maher & Seoin Talbot
update public.box_teams set r1 = 1.63, r2 = 2.18, updated_at = now() where id = '7742e7d7-319a-47f8-a7da-e0a8a0805772';  -- Gary Stephenson & Wayne Neary
update public.box_teams set r1 = 2.3, r2 = 2.32, updated_at = now() where id = '595875d3-6529-4007-b122-79310f387989';  -- Ross Stephenson & Ross Hamilton
update public.box_teams set r1 = 1.22, r2 = 1.11, updated_at = now() where id = '60fe6999-4a42-4f24-9df8-d3f2bd4b80f5';  -- Damien Dunne & Joanne Dunne
update public.box_teams set r1 = 2.41, r2 = 1.45, updated_at = now() where id = 'a3e27fbd-707a-4b22-b573-45b597702a51';  -- Claire Austen & CJ Adams
update public.box_teams set r1 = 0.98, r2 = 1.68, updated_at = now() where id = '866339f6-ed00-46be-929f-4697a280ca92';  -- Alan Cleary & Alex Hassett
update public.box_teams set r2 = 1.14, updated_at = now() where id = 'b71f734c-660a-4996-94b6-47229504dc96';  -- Fran Ford & D M
update public.box_teams set r1 = 1.76, r2 = 1.51, updated_at = now() where id = '6e6d0d32-2474-49c5-8511-78bbe2e23742';  -- Clinton Verhoog & Patrick Ffrench
update public.box_teams set r1 = 1.23, r2 = 0.73, updated_at = now() where id = '4d16bf47-9be6-43e2-a60a-720ac43ad75e';  -- Zydre & Indre Simkute
update public.box_teams set r1 = 1.54, r2 = 1.89, updated_at = now() where id = '4b1c987f-2e5d-4e28-873c-b04631f109d3';  -- Niamh Cassidy & Linda Dempsey
update public.box_teams set r1 = 1.58, updated_at = now() where id = 'eed47f73-6c14-4cce-8bf3-cbeea721ef36';  -- Fergal O'Dwyer & Herve Hamard
update public.box_teams set r1 = 1.19, r2 = 0.53, updated_at = now() where id = '8dc26ef6-e4cc-4c84-bc31-dd133d1aa601';  -- Felix Rothschild & Cillian Dunne
update public.box_teams set r1 = 1.97, r2 = 2.24, updated_at = now() where id = '9a61e70a-e8c8-45b1-a604-a8366615d595';  -- Diego Gomes & Adalberto Almeida
update public.box_teams set r1 = 0.81, r2 = 2.07, updated_at = now() where id = '8199827f-6e1d-4975-85cb-569b664ceb8a';  -- Nicole Mello Teixeira de Almeida & Grainne Ring (2)
update public.box_teams set r1 = 1.29, r2 = 1.46, updated_at = now() where id = 'd4a7bfe3-1719-4147-b06a-eb704035e220';  -- Eoin Tiernan & Eamonn Madden
update public.box_teams set r1 = 1.39, r2 = 1.21, updated_at = now() where id = 'a1caad5b-7638-4a4a-8b22-e6804654d7d4';  -- Boodhan Rampersaud & Anto Doran
update public.box_teams set r1 = 1.03, r2 = 1.22, updated_at = now() where id = '6bafd4a9-cacb-4110-b56a-bc274c0d9469';  -- Rick Deady & Shirley Deady
update public.box_teams set r1 = 0.74, r2 = 1.06, updated_at = now() where id = '297e8493-19f4-4a7c-85fc-190062c63bd2';  -- Michele McCormack & Sonja
update public.box_teams set r1 = 1.27, r2 = 1.69, updated_at = now() where id = 'b61f7f3d-a18e-4fed-b67c-4e37c9e770a3';  -- Conor Dodd & Dillon Mordaunt
update public.box_teams set r1 = 0.73, r2 = 0.81, updated_at = now() where id = 'cd0fc588-41c1-4ddd-bf9a-99088ab8aeab';  -- Eva Rybak & Kris Rybak
update public.box_teams set r1 = 2.25, r2 = 2.22, updated_at = now() where id = '477497d9-46ec-46be-8b90-7425dc996e2d';  -- John Lester & Kyle Dempsey
update public.box_teams set r1 = 1.02, r2 = 1.69, updated_at = now() where id = '56272c09-1188-496d-ba83-435a4f6c9f06';  -- Gary Brady & Ciaran O'Donoghue
update public.box_teams set r1 = 0.92, r2 = 1.06, updated_at = now() where id = '30cd0825-f8b5-4c7d-b897-bb1a5f26056b';  -- Katie Marie & Aoife Williams
update public.box_teams set r1 = 1.6, r2 = 1.21, updated_at = now() where id = 'b9d394fe-a787-42cd-af2a-15f626c73ff9';  -- Zach Mac & John McAnulty
update public.box_teams set r1 = 1.51, updated_at = now() where id = 'e748453d-b076-4f7e-b8a2-f96e59caf377';  -- Paddy Driver & Paddy Logue
update public.box_teams set r1 = 1.09, r2 = 0.61, updated_at = now() where id = '5e3fe1d4-e4aa-4bd6-a73e-06727ad20299';  -- Ian Donoghue & Sean Cleary
update public.box_teams set r1 = 0.51, r2 = 0.65, updated_at = now() where id = 'de7e4231-3f92-4476-9e6d-e4d9b1375378';  -- Caragh Daly & Kerry Callery
update public.box_teams set r1 = 1.53, r2 = 0.76, updated_at = now() where id = '588d3a1f-34c4-4f41-bc72-bd91f24391e9';  -- Orla Murphy Fleming & Doireann
update public.box_teams set r1 = 1.15, r2 = 1.69, updated_at = now() where id = '6022b12d-fe69-401d-bd56-6080b6c42d00';  -- Helena Plower & Olive Ramsay
update public.box_teams set r2 = 0.57, updated_at = now() where id = '07adc66f-b834-4787-b72f-88924143d450';  -- Sandra Dunne & Kerrie Beacom
update public.box_teams set r1 = 0.98, r2 = 1.76, updated_at = now() where id = '826bc4af-0271-4f3a-9448-86ba76d7f191';  -- Adam Macaulay & Giedre Guobyte
update public.box_teams set r1 = 1.26, r2 = 0.7, updated_at = now() where id = 'a2d6d21c-95cf-4a8f-8fca-61cff7e3ebb8';  -- Jack Evans & Gavin Fogarty
update public.box_teams set r1 = 0.92, r2 = 0.89, updated_at = now() where id = '4fc1dc08-1771-4ec7-91d6-bc7a0feaac26';  -- Elaine Kirwan & Christina Reilly
update public.box_teams set r1 = 0.81, updated_at = now() where id = '9ef4a73f-4532-42e6-a74f-5a51c742d403';  -- Ciara Kavanagh (2) & Ciaran Conlon
update public.box_teams set r1 = 0.54, r2 = 0.55, updated_at = now() where id = 'ed1bfd29-37a5-4159-9f22-212a5b84f486';  -- Peter O'Gara & Ross McHugh
update public.box_teams set r1 = 0.75, r2 = 1.09, updated_at = now() where id = '42e77997-d25b-4640-9c6b-c44d3ce2d09e';  -- Emily Tebbitt & Noeleen Cunningham
update public.box_teams set r1 = 1.71, r2 = 3.04, updated_at = now() where id = '97531105-27e8-4582-abf9-f201626b2b7e';  -- Barry MacCourt & Michael Gombart
update public.box_teams set r2 = 1.32, updated_at = now() where id = 'ec1ac3c7-9194-42cc-9c33-6149739dd242';  -- Aoife Shine & Niall Ryan
update public.box_teams set r1 = 1.04, r2 = 1.04, updated_at = now() where id = 'c98e7ec9-8e0c-41b8-9d4d-960a6edc81b0';  -- John Kavanagh & Kellie Kavanagh
update public.box_teams set r1 = 1.01, r2 = 1.01, updated_at = now() where id = 'dc361a60-76e9-43dc-bf81-4c9ce0d71f85';  -- Rhys Mansueto & Jeff O'Brien
update public.box_teams set r1 = 1.76, r2 = 1.47, updated_at = now() where id = 'df5ed694-451c-4c8f-8ad7-8d1901cfe764';  -- Ken & Maria Neilan
update public.box_teams set r1 = 0.67, r2 = 1.3, updated_at = now() where id = 'd1652889-145a-40b9-a87f-6d32e6a84a0c';  -- Keith Taurai & Conor McMahon
update public.box_teams set r2 = 0.9, updated_at = now() where id = '354662ae-ac31-4900-afbd-d11ccbf00289';  -- Pravin Kaware & Yashvardhan Singh Rathore
update public.box_teams set r2 = 1.84, updated_at = now() where id = '07a419cd-7aff-4ec5-9f71-a2dd2200ca8e';  -- Cormac Maher & Ittira Joseph
update public.box_teams set r1 = 1.06, r2 = 1.06, updated_at = now() where id = 'c96c3821-d439-42fb-9771-4a1e7985aca6';  -- Orlagh McMullan & Caroline Delahunt
update public.teams set r1 = 5.11, r2 = 4.6, updated_at = now() where id = 'bc24d564-247f-4116-a5e2-3dde99a7b204';  -- Peter Finnegan & Davy O'Sullivan
update public.teams set r1 = 4.58, r2 = 4.19, updated_at = now() where id = '45e90a98-907a-49de-b971-ed4fef5025dc';  -- Shane Donohoe & Dylan Orr
update public.teams set r1 = 4.74, r2 = 4.38, updated_at = now() where id = '33b592a2-065a-47d7-a371-fb1d59528dc5';  -- Robert Pickerill & David Hennebry
update public.teams set r1 = 3.8, r2 = 3.41, updated_at = now() where id = 'ea541a70-f65c-44bc-8034-c23b23feada6';  -- Dean Noble & Chris Ffrench
update public.teams set r1 = 3.25, r2 = 2.93, updated_at = now() where id = '6f3ec98d-6887-45e6-9be6-800f790305dd';  -- Greg Shine & Sam Vargas
update public.teams set r1 = 2.9, r2 = 2.83, updated_at = now() where id = '77d07338-4116-4fd7-8692-cfabd06dfb8e';  -- Nathan Condell & Simon Matthews
update public.teams set r1 = 4.2, updated_at = now() where id = '7955d401-3729-400c-8e92-4c5e85603bb3';  -- Christopher Byrne & Barry Kelly
update public.teams set r1 = 2.64, updated_at = now() where id = '14645c79-43d7-45d6-bcf3-ba3123ba2983';  -- Jack Colaluca & Oussama
update public.teams set r1 = 2.08, r2 = 0.72, updated_at = now() where id = '7a3e128b-d29d-4c3d-9d78-3d3e321cea8d';  -- Jack Noble & Fionn O'Higgins
update public.teams set r1 = 2.04, r2 = 2.2, updated_at = now() where id = '4b3ff9fe-0cb1-4f1a-9487-bc9638b06097';  -- Aron Souto & John D
update public.teams set r1 = 1.37, r2 = 2.07, updated_at = now() where id = '6701b4db-2cf6-4b73-a870-f35def277a91';  -- Ciara Kavanagh & Grainne Ring
update public.teams set r1 = 2.37, r2 = 1.76, updated_at = now() where id = '017dcc0e-056b-41ec-a42c-627cdb7dd85b';  -- Patrick Kennelly & Aisling O'Brien
update public.teams set r1 = 1.56, r2 = 2.04, updated_at = now() where id = '682da521-e75f-41be-8ffa-e35c87431683';  -- Mark Tindale & Mark Williams
update public.teams set r1 = 2.49, r2 = 2.28, updated_at = now() where id = '3f2812d0-ca30-4f49-ad0c-c5c63489cfe7';  -- Shaun Humby & Thomas McKeon
update public.teams set r1 = 2.32, r2 = 1.67, updated_at = now() where id = '26d031b3-f774-4476-b7f8-1e805143ac6c';  -- Ross Hamilton & Lucy McGettigan
update public.teams set r1 = 1.02, r2 = 1.69, updated_at = now() where id = 'e5ecb5fc-4bf3-4d98-a0a6-9c1743274d73';  -- Gary Brady & Ciaran O'Donoghue
update public.teams set r1 = 2.57, r2 = 2.45, updated_at = now() where id = '62da68dd-80f6-4d26-ae14-a449466bf150';  -- Wesley Wojnar & Tom Maguire
update public.teams set r1 = 0.5, r2 = 1.2, updated_at = now() where id = '0fae5c1b-986f-45fe-8935-cda5fa75337c';  -- Juliette Kidd & Marie Galligan
update public.teams set r1 = 1.41, updated_at = now() where id = '55cc30f8-3f19-4775-a00f-136ffba1539b';  -- Patrick Sturgess & Paula Battori
update public.teams set r1 = 2.72, r2 = 2.47, updated_at = now() where id = 'e5775ed4-cb67-41a5-a15a-6468c5c845d2';  -- Mark O'Sullivan 1 & Brian O'Sullivan
update public.teams set r1 = 2.93, r2 = 3.91, updated_at = now() where id = '92e97cc0-51e9-4a12-acb0-cbc3e0e8bd48';  -- Antonio Loboschi & Sahil Kaistha
update public.teams set r1 = 1.59, updated_at = now() where id = '77bfb39a-bf72-4880-ab02-4e29867e9672';  -- Mark O'Sullivan 2 & Danny Mccoy
update public.teams set r1 = 1.72, r2 = 2.57, updated_at = now() where id = 'a93c2d87-3878-46fb-81c7-532e9e6c3e88';  -- Brian McVicar & Lee Fitzpatrick
update public.teams set r1 = 2.14, r2 = 2.58, updated_at = now() where id = '897c9acd-784a-48d1-b15b-73cde3134014';  -- Ana J & Kieran Fraser
update public.teams set r1 = 2.78, r2 = 1.8, updated_at = now() where id = '8b0ad15f-c884-4554-8ec5-3354db001967';  -- Callum Smale & Ryan Tolan
update public.teams set r1 = 0.65, r2 = 1.54, updated_at = now() where id = '11383d91-a854-4f1c-b1c0-9c551d267e73';  -- Kerry Callery & Niamh Cassidy
update public.teams set r1 = 1.93, r2 = 0.51, updated_at = now() where id = 'add5673a-031b-4907-95c4-da9f63862623';  -- Oce Mapp & John Frazer
update public.teams set r1 = 1.15, r2 = 1.71, updated_at = now() where id = 'f962636f-b6b7-4482-b2b1-a73f38d724f9';  -- Paula Wood & Conor O'Neill
update public.teams set r1 = 1.08, r2 = 1.42, updated_at = now() where id = '3019c2c8-9682-4543-aaaa-9cb9d7df63af';  -- David VanDuyvenvoorde & Karl Lawler
update public.teams set r2 = 1.27, updated_at = now() where id = 'a55bdacd-76cf-4452-9546-0b0550587d40';  -- Dilan Mordaunt & Conor Dodd
update public.teams set r1 = 0.73, r2 = 0.81, updated_at = now() where id = '94a9fb06-e32d-4c98-aa21-5ece28f99626';  -- Eva Rybak & Kris Rybak
update public.teams set r1 = 1.47, r2 = 0.51, updated_at = now() where id = '0cade11c-39a5-4a7e-9580-9d96240fad5e';  -- Maria Neilan & Caragh Daly
update public.teams set r1 = 2.75, r2 = 3.06, updated_at = now() where id = '8a9683ca-d92b-4791-b015-2f3f3b4e0756';  -- Richie Cotter & Ronan Royce
update public.teams set r1 = 2.83, r2 = 2.81, updated_at = now() where id = 'ff432314-9956-47a3-aea0-0aaa30d21ebd';  -- Gareth Murphy & Jim Foley
update public.teams set r1 = 2.85, r2 = 5.1, updated_at = now() where id = '221b18e7-ea20-481d-8998-55f469ce57e0';  -- Leah Spillane & Ashley Wynne
update public.teams set r1 = 0.67, r2 = 1.27, updated_at = now() where id = '0c555c9f-d013-4788-a69f-657db97248c2';  -- Conn Kinsella & Oran Dunning
update public.teams set r2 = 2.18, updated_at = now() where id = '3aa22b68-574b-45a4-8f5d-f0725714071c';  -- Sam Walker & Kasey Clark
update public.teams set r2 = 2.39, updated_at = now() where id = '6f988ace-a507-4ecc-865e-6b2710c8aec9';  -- Anton Burlihin & Mark Banim
update public.teams set r1 = 1.12, r2 = 2.8, updated_at = now() where id = 'aea54ed5-920f-4ebc-a5a5-32d78aaf1f97';  -- Oisin Brown & Cillian Williams
update public.teams set r1 = 1.84, r2 = 2.39, updated_at = now() where id = '30f1b527-13c4-4328-8b22-628e55a6def9';  -- Lillian Carthy & Peter Dunne
update public.teams set r1 = 3.01, r2 = 2.41, updated_at = now() where id = 'ae8547b3-d868-4292-845d-aa3c0f466f91';  -- Nicky Gethin Taggart & Claire Austen
update public.teams set r1 = 2.5, r2 = 2.77, updated_at = now() where id = '956becb9-1337-4520-a81b-636bb678df9e';  -- Kayleigh Sullivan & Leanne S
update public.teams set r1 = 0.5, r2 = 0.54, updated_at = now() where id = '2662dc3d-07ec-4207-ac54-c2caefb49996';  -- Jack Wu & Peter Mitchell
update public.teams set r1 = 1.22, r2 = 1.03, updated_at = now() where id = '5e53bc0e-54ef-4a3b-b406-da03dd03b495';  -- Shirley Deady & Rick Deady
update public.teams set r1 = 0.57, r2 = 0.66, updated_at = now() where id = '0d68f49a-19bb-4957-8b43-c3ac29a968d0';  -- Kerrie Beacom & Sandra Dunne
update public.teams set r1 = 3.22, r2 = 3.18, updated_at = now() where id = '8bd7bb6e-beb7-41e5-968e-168f458faa0e';  -- Andy Earls & Robert Keogh
update public.teams set r1 = 6.42, r2 = 3.91, updated_at = now() where id = '1ea17980-ae90-4a26-ad3a-2fbad7dc27d4';  -- John Fitz 202 & David
update public.teams set r1 = 2.78, updated_at = now() where id = 'f11580c4-579b-455a-85c6-c0316db92912';  -- David Kennan & Paul McGlade
update public.teams set r2 = 5.1, updated_at = now() where id = '24ad96a9-7f6d-4f1e-83c7-bdc1103c3aef';  -- Rob Lucy & Lee Biddulph
update public.teams set r2 = 2.58, updated_at = now() where id = '589cd9d2-49da-4a36-9bb0-589dbb434da6';  -- Stevan O'Toole & Padraic Bermingham
update public.teams set r1 = 2.51, updated_at = now() where id = 'd159f467-1855-42e9-8d07-153f91493d4e';  -- Colm Bolger & Brian Cornyn
update public.teams set r1 = 3.64, r2 = 3.43, updated_at = now() where id = '592e19a2-caa0-4fc2-9d2d-aa688eacd545';  -- Matthew & Mike Shanahan
update public.teams set r1 = 3.2, r2 = 3.3, updated_at = now() where id = '58da7df0-c02b-4088-b319-294555c74ae9';  -- Jack Furlong & Dylan Furlong
update public.teams set r1 = 3.34, r2 = 2.33, updated_at = now() where id = 'e79bbd3d-a9ad-47da-9b68-983aa550963f';  -- Dylan Frazer & Sean Leonard
update public.teams set r1 = 2.85, r2 = 3.37, updated_at = now() where id = '95633f64-d4ef-4eb1-a64b-82f979ed7e20';  -- Ella Tindale & Sahir Mangat
update public.teams set r1 = 2.96, r2 = 1.95, updated_at = now() where id = '4db1ee60-d1d4-4e3d-b7c1-7a2171a1f740';  -- Kevin Finnegan & Richie Carroll
update public.teams set r1 = 3.14, r2 = 1.76, updated_at = now() where id = '63f40b7a-8ba9-4e51-bb94-1ec3a52fc5c4';  -- James Connolly & Clinton Verhoog
