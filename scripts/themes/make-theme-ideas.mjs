// Generates docs/theme-ideas.json (read by the Studio's "Next theme") and
// docs/theme-ideas.txt (ChatGPT prompts to read or copy) from the list below.
// Run with: node scripts/themes/make-theme-ideas.mjs
//
// Each idea: [name, mood, background, accent, particle style, particle colours,
// font (Google Fonts name or null for the default), price (coins, or 'premium'),
// background scene, button material, icon subject, tagline]

import { writeFileSync } from 'node:fs';

import { derivePalette } from './palette.mjs';

const GROUPS = {
  'Nature': [
    ['Forest Glade', 'light', '#EEF6E8', '#5FAF5A', 'leaves', ['#A8D98F', '#E8C97A'], null, 500, 'a sunny forest clearing with ferns, mushrooms and tall trees at the edges', 'smooth polished light wood', 'a cute smiling acorn', 'Sunlight through the leaves'],
    ['Mushroom Village', 'light', '#F7F0E6', '#D9534F', 'leaves', ['#E8B08A', '#C9D98F'], 'Baloo 2', 1000, 'tiny red-capped mushroom houses with round windows along the bottom and sides', 'soft cream stone', 'a red spotted mushroom house', 'Tiny doors, big adventures'],
    ['Sunflower Field', 'light', '#FFF8E1', '#F2A93B', 'petals', ['#FFD54F', '#FFB74D'], null, 500, 'rows of smiling sunflowers under a pale blue sky', 'warm golden straw weave', 'a smiling sunflower', 'Always facing the sun'],
    ['Bamboo Grove', 'light', '#EEF7EC', '#3E9B6C', 'leaves', ['#9FD8A6', '#C7E8B0'], null, 500, 'tall green bamboo stalks at the edges with soft morning mist', 'smooth pale bamboo', 'a fresh bamboo sprout', 'Calm and steady'],
    ['Rainforest', 'light', '#E6F4EA', '#1E9E6A', 'leaves', ['#7FD1A0', '#FFB26B'], null, 1000, 'lush jungle leaves, vines and a small waterfall at the sides', 'glossy green leaf', 'a tropical leaf with a dewdrop', 'Where the wild sums grow'],
    ['Lavender Fields', 'light', '#F4F0FA', '#8E6BC8', 'petals', ['#C9B3F0', '#E4D8FA'], 'Quicksand', 500, 'rolling purple lavender rows under a soft sunset', 'soft lilac linen', 'a sprig of lavender', 'Soothing purple hills'],
    ['Butterfly Garden', 'light', '#FDF3F7', '#E86AA0', 'confetti', ['#FFB3D1', '#B3E5FC', '#FFE082'], null, 500, 'a flower garden with colourful butterflies near the edges', 'soft pastel flower petal', 'a pastel butterfly', 'Flutter by, math star!'],
    ['Cactus Desert', 'light', '#FFF4E4', '#E07B39', 'sunbeams', ['#FFD8A8', '#FFC08A'], null, 500, 'a gentle desert with cute cacti and pink rock hills at the edges', 'warm terracotta clay', 'a smiling cactus in a pot', 'Prickly but friendly'],
    ['Lily Pond', 'light', '#EAF6F4', '#3BAE9A', 'bubbles', ['#BDE8E0', '#F7C6D9'], null, 500, 'a calm pond with lily pads and pink water lilies at the edges', 'smooth jade stone', 'a pink water lily', 'Ripples of calm'],
    ['Mountain Lake', 'light', '#EAF2F8', '#3A7CC0', 'sunbeams', ['#CFE3F5', '#FFFFFF'], null, 1000, 'snowy mountains reflected in a still blue lake along the bottom', 'smooth grey river stone', 'a snowy mountain peak', 'Fresh air and clear thinking'],
    ['Firefly Night', 'dark', '#15233A', '#F5C84C', 'sparkles', ['#FFE58A', '#C8F08F'], null, 1000, 'a dark blue meadow at night with glowing fireflies and tall grass at the edges', 'dark wood with a warm glow', 'a jar of glowing fireflies', 'Little lights in the dark'],
    ['Tulip Garden', 'light', '#FFF3F0', '#E4574F', 'petals', ['#FF9E9E', '#FFD1DC'], null, 500, 'rows of red, pink and yellow tulips with a windmill far away', 'soft painted tile', 'a red tulip', 'Spring in full bloom'],
    ['Enchanted Moss', 'light', '#EEF5E6', '#6C9A3B', 'sparkles', ['#D6F0A8', '#FFF6B3'], null, 1000, 'mossy stones and tiny glowing plants at the edges of a soft green forest', 'soft green moss', 'a glowing mossy stone', 'Soft steps, bright ideas'],
    ['Savanna Sunset', 'light', '#FFF1E0', '#E0782E', 'sunbeams', ['#FFC98A', '#FFB07A'], null, 1000, 'an orange savanna sunset with acacia trees at the edges', 'warm sandstone', 'a little acacia tree at sunset', 'Golden hour for numbers'],
    ['Rainbow Hills', 'light', '#F4FAFF', '#7C5CFF', 'confetti', ['#FFB3BA', '#BAFFC9', '#BAE1FF', '#FFFFBA'], null, 500, 'soft green hills under a big pastel rainbow', 'smooth pastel rainbow gradient', 'a pastel rainbow with two clouds', 'Every colour counts'],
  ],
  'Ocean & water': [
    ['Coral Reef', 'light', '#E6F7FA', '#FF7A6B', 'bubbles', ['#9FE2F0', '#FFB3A7'], null, 1000, 'colourful coral and seaweed along the bottom with soft blue water above', 'smooth pink coral', 'a pink coral branch', 'A reef full of friends'],
    ['Deep Sea', 'dark', '#0B2238', '#2FD3E0', 'bubbles', ['#3BC9DB', '#9BE7F0'], null, 'premium', 'the deep ocean with glowing jellyfish and glowing plants at the edges', 'dark glassy sea blue', 'a glowing jellyfish', 'Glow in the deep'],
    ['Tropical Beach', 'light', '#FFF7E8', '#1FB5C8', 'sunbeams', ['#FFE3A8', '#B8EEF5'], null, 500, 'a sandy beach with palm trees at the sides and a turquoise sea', 'smooth warm sand', 'a palm tree on a tiny island', 'Sun, sand and sums'],
    ['Tide Pools', 'light', '#EEF7F5', '#F08A5D', 'bubbles', ['#BFE6DF', '#FFD3B8'], null, 500, 'rocky tide pools with starfish and shells along the bottom', 'smooth frosted sea glass', 'a starfish and a shell', 'Treasures at low tide'],
    ['Lighthouse Bay', 'light', '#EDF4FA', '#D9534F', 'bubbles', ['#CFE3F5', '#FFFFFF'], null, 1000, 'a red and white lighthouse on the rocks at the side of a calm bay', 'weathered white wood', 'a little lighthouse', 'Guiding you home'],
    ['Pirate Cove', 'light', '#F6F0E4', '#C0392B', 'sparkles', ['#FFD54F', '#FFF1B8'], 'Sniglet', 1000, 'a friendly pirate cove with a treasure chest and a ship at the edges', 'old treasure map parchment', 'a treasure chest full of gold coins', 'X marks the answer'],
    ['Mermaid Lagoon', 'light', '#EAF7F7', '#B45FD0', 'sparkles', ['#B3E5FC', '#E1BEE7'], null, 'premium', 'a shimmering lagoon with pearls, shells and seaweed at the edges', 'shimmering mother of pearl', 'a pearl in an open shell', 'Pearls of wisdom'],
    ['Waterfall Oasis', 'light', '#E8F6F2', '#2A9D8F', 'bubbles', ['#BDEBE3', '#FFFFFF'], null, 1000, 'a waterfall into a green pool with tropical plants at the sides', 'wet smooth pebble', 'a small waterfall', 'Let the numbers flow'],
    ['Submarine', 'light', '#E5F3FB', '#F2B233', 'bubbles', ['#BCE3F7', '#FFFFFF'], null, 1000, 'the view from a yellow submarine with fish and bubbles at the edges', 'riveted brass', 'a yellow submarine', 'Dive into maths'],
    ['Seashell Shore', 'light', '#FFF6F1', '#E8836B', 'petals', ['#FFD6C9', '#FDEBD0'], 'Quicksand', 500, 'pastel seashells scattered on soft pink sand along the bottom', 'polished pink shell', 'a spiral seashell', 'Listen to the sea'],
  ],
  'Sky & space': [
    ['Cotton Clouds', 'light', '#F0F6FF', '#6C8EF0', 'sunbeams', ['#FFFFFF', '#DCE8FF'], null, 500, 'fluffy white clouds in a soft blue sky', 'soft cloud white', 'a smiling cloud', 'Head in the clouds'],
    ['Hot Air Balloons', 'light', '#FFF6EC', '#F26B5B', 'confetti', ['#FFB3A7', '#A7D8FF', '#FFE08A'], null, 1000, 'colourful hot air balloons floating near the edges of a sunrise sky', 'striped balloon fabric', 'a striped hot air balloon', 'Up, up and away'],
    ['Rocket Launch', 'dark', '#141B3C', '#FF8A3D', 'stars', ['#FFFFFF', '#FFD27A'], null, 1000, 'a cartoon rocket launch pad at the bottom with stars above', 'brushed silver metal', 'a little rocket', '3, 2, 1... blast off!'],
    ['Planets', 'dark', '#1A1440', '#FFB84D', 'stars', ['#FFFFFF', '#C9B8FF'], null, 1000, 'colourful cartoon planets and rings around the edges of a starry sky', 'smooth swirling planet rings', 'a ringed planet', 'Out of this world'],
    ['Nebula', 'dark', '#1B0F33', '#FF6FD8', 'sparkles', ['#FF9DE2', '#9DB8FF'], null, 'premium', 'a glowing pink and purple nebula with twinkling stars', 'swirling cosmic glass', 'a glowing cluster of stars', 'Made of stardust'],
    ['Moonlit Night', 'dark', '#121A33', '#F5D76E', 'stars', ['#FFFFFF', '#FFE9A8'], null, 1000, 'a big friendly crescent moon over sleepy hills', 'soft midnight velvet', 'a sleepy crescent moon', 'Dreamy and bright'],
    ['Sunrise', 'light', '#FFF1E8', '#FF8A5B', 'sunbeams', ['#FFD1B8', '#FFE3A8'], null, 500, 'a soft pastel sunrise over rolling hills', 'warm peach glass', 'a smiling rising sun', 'A fresh start'],
    ['Observatory', 'dark', '#16213F', '#7FD1FF', 'stars', ['#FFFFFF', '#BFE6FF'], null, 1000, 'an observatory dome with a telescope at the side under a starry sky', 'polished navy and brass', 'a telescope', 'Look to the stars'],
    ['Comet Trail', 'dark', '#10183A', '#6FE3FF', 'sparkles', ['#BFF3FF', '#FFFFFF'], null, 1000, 'a bright comet with a long sparkling tail across a dark blue sky', 'icy blue crystal', 'a smiling comet', 'Fast as a comet'],
    ['Space Station', 'dark', '#151D2E', '#4FD18B', 'stars', ['#FFFFFF', '#9EF0C4'], null, 'premium', 'a friendly space station with round windows and solar panels at the edges', 'white spaceship panel', 'an astronaut helmet', 'Mission: math!'],
    ['Kite Day', 'light', '#EEF7FF', '#FF6B8A', 'confetti', ['#FFB3C6', '#B3DAFF', '#FFE8A3'], null, 500, 'colourful kites flying in a breezy blue sky above a green field', 'light kite cloth', 'a diamond kite with a bow tail', 'Let your ideas fly'],
    ['Paper Planes', 'light', '#F4F7FB', '#4A90E2', 'none', [], null, 500, 'white paper planes gliding through a pale sky with dotted flight paths', 'folded white paper', 'a paper plane', 'Take off with every answer'],
  ],
  'Seasons & weather': [
    ['Autumn Leaves', 'light', '#FFF4E6', '#D9682E', 'leaves', ['#F2A65A', '#E0703A', '#F6C453'], null, 500, 'autumn trees with orange and red leaves at the edges', 'warm maple wood', 'an orange maple leaf', 'Crunchy leaves, clever sums'],
    ['Winter Wonderland', 'light', '#EEF5FB', '#4F8FD9', 'petals', ['#FFFFFF', '#D6E9FF'], null, 500, 'snowy pine trees and soft snowy hills', 'frosted ice', 'a snowflake', 'Snow day, math day'],
    ['Spring Showers', 'light', '#F0F7F2', '#4DB6AC', 'bubbles', ['#B2DFDB', '#FFFFFF'], null, 500, 'soft spring rain with puddles, umbrellas and flowers at the edges', 'glossy raindrop glass', 'a cute umbrella', 'Sunshine after the rain'],
    ['Summer Picnic', 'light', '#FFF9EE', '#E85D5D', 'confetti', ['#FFB3A7', '#FFE08A', '#B3E5B3'], null, 500, 'a picnic blanket, basket and fruit on green grass along the bottom', 'red and white gingham', 'a picnic basket', 'A treat for your brain'],
    ['Thunderstorm', 'dark', '#1C2233', '#FFD23F', 'sparkles', ['#FFE680', '#B3C7FF'], null, 1000, 'dark stormy clouds with friendly lightning bolts at the edges', 'slate grey storm cloud', 'a cute lightning bolt', 'Quick as lightning'],
    ['Snowy Cabin', 'light', '#F2F5FA', '#B5563A', 'petals', ['#FFFFFF', '#DDE8F5'], null, 1000, 'a cosy log cabin with warm lit windows in the snow', 'warm log wood', 'a log cabin with a smoking chimney', 'Warm inside, snowy outside'],
    ['Pumpkin Patch', 'light', '#FFF3E3', '#E97D2B', 'leaves', ['#F7A64A', '#C98B4B'], null, 500, 'a pumpkin patch with hay bales along the bottom', 'orange pumpkin skin', 'a smiling pumpkin', 'Picking the ripest answers'],
    ['Foggy Morning', 'light', '#F1F3F6', '#7A8CA8', 'sunbeams', ['#FFFFFF', '#E2E8F0'], 'Quicksand', 500, 'a soft misty morning over a quiet lake with reeds', 'smooth grey pebble', 'a little sun behind a cloud', 'Clear heads on misty days'],
    ['Windy Day', 'light', '#F2F8F4', '#5CB85C', 'leaves', ['#A8D98F', '#FFFFFF'], null, 500, 'a breezy day with leaves and dandelion seeds blowing across a field', 'light fresh green', 'a dandelion puff', 'Blow a wish, solve a sum'],
    ['Frozen Lake', 'light', '#EAF4FB', '#3AA6D0', 'sparkles', ['#BFE6FF', '#FFFFFF'], null, 1000, 'a frozen lake with snowy pine trees at the edges', 'clear blue ice', 'an ice skate', 'Glide through the numbers'],
  ],
  'Sweets & treats': [
    ['Ice Cream Parlour', 'light', '#FFF4F7', '#F06292', 'confetti', ['#FFB3C6', '#FFF0B3', '#B3E5FC'], null, 500, 'ice cream cones, sprinkles and a striped awning at the top', 'strawberry ice cream swirl', 'an ice cream cone', 'The coolest maths'],
    ['Bakery', 'light', '#FFF7EC', '#C6773D', 'confetti', ['#F5D0A9', '#FFFFFF'], null, 500, 'a cosy bakery with cupcakes, croissants and bread on shelves at the edges', 'golden pastry crust', 'a cupcake with a cherry', 'Freshly baked sums'],
    ['Chocolate Factory', 'dark', '#3A241B', '#F2B6C6', 'confetti', ['#F7C6D0', '#FFF1D6'], null, 1000, 'rivers of chocolate and candy pipes at the edges', 'smooth milk chocolate', 'a chocolate bar', 'Sweet as can be'],
    ['Donut Shop', 'light', '#FFF3F8', '#FF6FA8', 'confetti', ['#FF9EC4', '#9ED8FF', '#FFE08A'], null, 500, 'pink frosted donuts with sprinkles around the edges', 'pink frosting with sprinkles', 'a pink sprinkled donut', 'Hole-y delicious'],
    ['Fruit Market', 'light', '#F6FBEF', '#F28C28', 'leaves', ['#FFB84D', '#FF7B7B', '#9BDB6B'], null, 500, 'colourful fruit crates with apples, oranges and bananas along the bottom', 'juicy orange peel', 'a smiling strawberry', 'A healthy mind'],
    ['Bubble Tea', 'light', '#FBF4EC', '#A0714F', 'bubbles', ['#6B4A3A', '#E8D5C0'], null, 500, 'cute bubble tea cups and tapioca pearls at the edges', 'milky caramel', 'a bubble tea cup with a straw', 'Sip, think, solve'],
    ['Gingerbread House', 'light', '#FFF1E4', '#B85C2E', 'sparkles', ['#FFFFFF', '#FFB3B3'], null, 1000, 'a gingerbread house with icing and candy canes at the sides', 'gingerbread with white icing', 'a gingerbread cookie', 'Sweet and clever'],
    ['Pancake Breakfast', 'light', '#FFF8E6', '#E3A02B', 'confetti', ['#FFE08A', '#FFB3A7'], null, 500, 'stacks of pancakes with syrup, berries and butter along the bottom', 'golden pancake', 'a stack of pancakes with syrup', 'Breakfast for the brain'],
    ['Lollipop Land', 'light', '#FDF1FF', '#C75BE0', 'confetti', ['#FF9EE1', '#9EE8FF', '#FFF09E'], null, 1000, 'giant swirly lollipops and candy trees on pastel hills', 'swirly lollipop', 'a swirl lollipop', 'Swirls of fun'],
    ['Pizza Party', 'light', '#FFF6EA', '#E0492F', 'confetti', ['#FFD166', '#E0492F', '#8BC34A'], null, 500, 'pizza slices and party streamers at the edges', 'cheesy pizza crust', 'a pizza slice', 'A slice of maths'],
  ],
  'Fantasy & magic': [
    ["Dragon's Lair", 'dark', '#22141A', '#FF7A3D', 'sparkles', ['#FFB347', '#FF6B3D'], null, 'premium', "a friendly dragon's cave with piles of gold and glowing crystals at the edges", 'warm dragon scales', 'a baby dragon egg', 'Guarded by a friendly dragon'],
    ['Wizard Tower', 'dark', '#1C1633', '#B18CFF', 'sparkles', ['#D9C9FF', '#FFE8A3'], null, 'premium', "a wizard's tower room with floating books, potions and candles at the edges", 'old spell book leather', 'a wizard hat with stars', 'Maths is magic'],
    ['Fairy Garden', 'light', '#F6F2FB', '#E07BD0', 'sparkles', ['#FFC4F0', '#FFF2A8'], null, 1000, 'tiny fairy houses, glowing flowers and mushrooms', 'soft petal glass', 'a fairy wand', 'A sprinkle of fairy dust'],
    ['Unicorn Clouds', 'light', '#FDF5FF', '#FF8AD8', 'confetti', ['#FFB3E6', '#B3E0FF', '#FFF3B3'], null, 1000, 'pastel clouds, rainbows and stars in a dreamy sky', 'pastel rainbow cloud', 'a unicorn horn', 'Magic in every answer'],
    ['Castle Kingdom', 'light', '#F2F4FB', '#5B6FD8', 'confetti', ['#FFD54F', '#A7B6FF'], null, 1000, 'a fairytale castle with flags on a hill at the side', 'carved castle stone', 'a little castle with flags', 'Rule the kingdom of numbers'],
    ['Crystal Cave', 'dark', '#141C2E', '#7EE8FA', 'sparkles', ['#B3F5FF', '#E0B3FF'], null, 'premium', 'a glowing crystal cave with purple and blue crystals at the edges', 'cut crystal facets', 'a cluster of crystals', 'Shine bright'],
    ['Enchanted Library', 'dark', '#2A1E17', '#F2C14E', 'sparkles', ['#FFE08A', '#FFFFFF'], null, 1000, 'tall bookshelves with glowing floating books', 'leather book cover', 'a magic book with a star', 'Every page a puzzle'],
    ['Potion Lab', 'dark', '#1F1A2E', '#5BE38C', 'bubbles', ['#9BF0B8', '#D9A8FF'], null, 1000, 'bubbling colourful potion bottles on shelves at the edges', 'glass potion bottle', 'a bubbling potion', 'Mix, stir, solve!'],
    ['Floating Islands', 'light', '#EEF6FF', '#4CAF7D', 'sunbeams', ['#FFFFFF', '#CDEFD9'], null, 'premium', 'small floating grassy islands with waterfalls in the sky', 'mossy stone', 'a floating island', 'Sky-high thinking'],
    ['Magic Lamp', 'light', '#FFF4E0', '#D9A21B', 'sparkles', ['#FFE08A', '#FFFFFF'], null, 1000, 'a golden magic lamp, silk cushions and a starry arch', 'golden lamp brass', 'a golden magic lamp', 'Your wish: more sums!'],
    ['Pumpkin Night', 'dark', '#1E1530', '#FF8A1F', 'sparkles', ['#FFB347', '#B38BFF'], null, 1000, 'a friendly, not scary night with glowing pumpkins and smiling ghosts at the edges', 'glowing pumpkin', 'a smiling jack-o-lantern', 'Spooky-cute sums'],
    ['Treasure Island', 'light', '#FFF6E6', '#D98C1F', 'sparkles', ['#FFD54F', '#FFFFFF'], null, 1000, 'a sandy island with a treasure chest, palm trees and a map', 'treasure gold', 'a gold coin with a star', 'Hunt for the answers'],
  ],
  'Cosy & home': [
    ['Cosy Bedroom', 'light', '#FBF3EE', '#E08E79', 'sparkles', ['#FFD27A', '#FFB3A7'], null, 500, 'a cosy bedroom with fairy lights, plushies and a moon window', 'soft knitted blanket', 'a teddy bear', 'Snug as a bug'],
    ['Reading Nook', 'light', '#FAF4EA', '#7A9E6B', 'leaves', ['#C9D8A8', '#E8C9A0'], null, 500, 'a window seat with cushions, plants and stacks of books', 'soft cushion fabric', 'a stack of books', 'Curl up and count'],
    ['Toy Box', 'light', '#F7F7FF', '#F25F5C', 'confetti', ['#FFE066', '#70C1B3', '#F25F5C'], null, 500, 'building blocks, toy trains and teddies at the edges', 'smooth wooden toy block', 'a toy building block', 'Play and learn'],
    ['Tea Party', 'light', '#FFF6F4', '#D96C8A', 'petals', ['#F7B8C8', '#FFF0D9'], 'Quicksand', 500, 'a tea party table with teapots, cups and cakes', 'fine porcelain with little flowers', 'a teapot', 'Tea and sums, please'],
    ['Rainy Window', 'light', '#EEF2F6', '#5C7FA3', 'bubbles', ['#CFDCEA', '#FFFFFF'], null, 500, 'a cosy window with raindrops, a plant and a warm lamp', 'foggy window glass', 'a raindrop', 'Cosy days inside'],
    ['Knitting Basket', 'light', '#FBF2EC', '#C76B5A', 'none', [], null, 500, 'balls of yarn and knitted blankets in warm colours', 'chunky knitted wool', 'a ball of yarn with knitting needles', 'Knit together every number'],
    ['Campfire', 'dark', '#1A2433', '#F5A623', 'sparkles', ['#FFD27A', '#FF9E4D'], null, 1000, 'a campfire, a tent and marshmallows under a starry sky', 'canvas tent', 'a campfire with marshmallows', 'Stories by the fire'],
    ['Treehouse', 'light', '#F1F7EC', '#8B5E3C', 'leaves', ['#A8D98F', '#E8C97A'], null, 1000, 'a wooden treehouse with a rope ladder among green leaves', 'treehouse planks', 'a treehouse', 'The best hideout'],
  ],
  'Places & journeys': [
    ['City Lights', 'dark', '#141A2E', '#FFC857', 'sparkles', ['#FFE08A', '#9EC5FF'], null, 1000, 'a cute cartoon city skyline at night with lit windows', 'shiny taxi yellow', 'a little city building with lit windows', 'Big city, bright minds'],
    ['Paris Café', 'light', '#FAF4EF', '#D96C6C', 'petals', ['#F7C6C6', '#FFFFFF'], null, 1000, 'a Parisian café with striped awnings and the Eiffel Tower far away', 'striped café awning', 'a croissant', 'Bonjour, math!'],
    ['Japanese Garden', 'light', '#F8F4EE', '#C94F4F', 'petals', ['#F7B6C8', '#FFFFFF'], null, 1000, 'a Japanese garden with a red bridge, a koi pond and lanterns', 'smooth red lacquer', 'a paper lantern', 'Peaceful and precise'],
    ['Pyramids', 'light', '#FFF4DE', '#D4A017', 'sunbeams', ['#FFE3A8', '#F5D08A'], null, 1000, 'pyramids and palm trees under a golden sky', 'sandstone with gold trim', 'a little pyramid', 'Ancient maths, new fun'],
    ['Carnival', 'light', '#FFF4F0', '#E63946', 'confetti', ['#FFD166', '#06D6A0', '#E63946'], 'Lilita One', 1000, 'a carnival with a ferris wheel, striped tents and balloons', 'red and white circus stripes', 'a ferris wheel', 'Roll up for maths!'],
    ['Train Journey', 'light', '#F2F6F2', '#2F7D5B', 'sunbeams', ['#FFFFFF', '#DDE8D0'], null, 500, 'a little steam train crossing green hills', 'polished green train enamel', 'a steam train', 'All aboard!'],
    ['Farm Barn', 'light', '#FFF6EC', '#C8412F', 'leaves', ['#F2D06B', '#A8D98F'], null, 500, 'a red barn, fences and hay bales in the countryside', 'red barn wood', 'a red barn', 'Down on the farm'],
    ['Snowy Village', 'light', '#EEF3FA', '#D9534F', 'petals', ['#FFFFFF', '#DDE8F5'], null, 500, 'a snowy village with colourful wooden houses', 'painted wooden sign', 'a little wooden house with snow on the roof', 'Home sweet home'],
  ],
  'Gems & crafts': [
    ['Ruby Palace', 'dark', '#2A0F18', '#FF4D6D', 'sparkles', ['#FF8FA3', '#FFD6DE'], null, 'premium', 'a glittering palace hall with red rubies and gold', 'cut ruby facets', 'a ruby gem', 'Precious and bright'],
    ['Emerald City', 'dark', '#0F2A1E', '#37D67A', 'sparkles', ['#7CF0A8', '#E8FFD6'], null, 'premium', 'shining green towers and emerald gems', 'cut emerald facets', 'an emerald gem', 'Green with genius'],
    ['Sapphire Velvet', 'dark', '#0F1D3A', '#4D8BFF', 'sparkles', ['#9CC2FF', '#FFFFFF'], null, 'premium', 'sparkling blue sapphires on deep blue velvet', 'cut sapphire facets', 'a sapphire gem', 'Deep blue brilliance'],
    ['Stained Glass', 'light', '#F6F4F0', '#3A6EA5', 'confetti', ['#F25F5C', '#FFE066', '#70C1B3'], null, 1000, 'a colourful stained glass window with light shining through', 'coloured stained glass', 'a stained glass star', 'Colours of learning'],
    ['Origami', 'light', '#F7F6F2', '#E4572E', 'none', [], null, 500, 'colourful origami cranes, boats and flowers', 'folded coloured paper', 'an origami crane', 'Fold, count, repeat'],
    ['Crayon Doodles', 'light', '#FFFDF7', '#FF6B6B', 'confetti', ['#FF6B6B', '#4ECDC4', '#FFE66D'], 'Sniglet', 500, 'crayon doodles of stars, suns and hearts on white paper', 'crayon scribble texture', 'a box of crayons', 'Draw your own path'],
    ['Pottery Studio', 'light', '#FBF3EC', '#B5654A', 'none', [], null, 500, 'clay pots, a pottery wheel and plants', 'smooth terracotta glaze', 'a clay pot with a flower', 'Shape your skills'],
  ],
  'Sports & play': [
    ['Football Pitch', 'light', '#EEF7EE', '#2E9E4F', 'confetti', ['#FFFFFF', '#FFD54F'], null, 500, 'a green football pitch with goals and cheering flags', 'green pitch grass', 'a football', 'Score every goal'],
    ['Playground', 'light', '#F0F7FF', '#FF8C42', 'confetti', ['#FFB3A7', '#A7D8FF'], null, 500, 'slides, swings and a sandbox under a sunny sky', 'colourful plastic', 'a playground slide', "Let's play!"],
    ['Skate Park', 'light', '#F3F3F8', '#7B61FF', 'confetti', ['#FF6EC7', '#6EE7FF'], null, 1000, 'colourful ramps and skateboards with friendly graffiti', 'painted skateboard deck', 'a skateboard', 'Roll with it'],
    ['Race Track', 'light', '#F4F4F4', '#E63946', 'none', [], null, 1000, 'a race track with checkered flags and cartoon race cars', 'checkered flag', 'a race car', 'Speed through sums'],
    ['Swimming Pool', 'light', '#E6F7FB', '#1EA7D6', 'bubbles', ['#B3E8F5', '#FFFFFF'], null, 500, 'a sparkling pool with floats and a diving board', 'pool tile mosaic', 'a rubber duck float', 'Make a splash'],
    ['Circus Tent', 'light', '#FFF5EE', '#D62828', 'confetti', ['#FFD166', '#F77F00'], null, 1000, 'a big top circus tent with stars and hoops', 'red and gold circus stripe', 'a circus tent', 'The greatest show'],
    ['Music Stage', 'dark', '#1B1530', '#FF5DA2', 'sparkles', ['#FF9ECF', '#9EE7FF'], null, 1000, 'a stage with spotlights, music notes and instruments', 'shiny black and white piano keys', 'a music note', 'Maths makes music'],
    ['Dinosaur Valley', 'light', '#F1F6E8', '#6BA539', 'leaves', ['#A8D98F', '#F2C46B'], null, 1000, 'a prehistoric valley with a volcano, ferns and friendly dinosaurs at the edges', 'stone with fossil prints', 'a dinosaur footprint', 'Roar-some maths'],
  ],
};

// A few plain words for the colours, so ChatGPT matches the palette.
function colourWords(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const s = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (max !== min) h = (max === r ? ((g - b) / (max - min) + 6) % 6 : max === g ? (b - r) / (max - min) + 2 : (r - g) / (max - min) + 4) * 60;
  if (s < 0.12) return l > 0.85 ? 'soft white' : l < 0.25 ? 'deep charcoal' : 'soft grey';
  const name = h < 15 ? 'red' : h < 40 ? 'orange' : h < 65 ? 'yellow' : h < 160 ? 'green' : h < 195 ? 'teal' : h < 250 ? 'blue' : h < 290 ? 'purple' : h < 340 ? 'pink' : 'red';
  return `${l > 0.85 ? 'pale ' : l < 0.3 ? 'deep ' : ''}${name}`;
}

const backgroundPrompt = (idea) =>
  `Create a portrait phone wallpaper (9:16) for a children's math game: ${idea.scene}. Soft, dreamy, kawaii illustration style in ${colourWords(idea.background)} and ${colourWords(idea.accent)} tones${idea.mood === 'dark' ? ', a dark night-time scene' : ''}. Keep the middle calm and simple with soft gradients, because numbers and buttons will sit on top; put the details near the edges and along the bottom. No characters in the centre, no text, no numbers, no letters, no user interface.`;

const assetsPrompt = (idea) =>
  `Create two separate images side by side in one wide landscape picture, with clear empty space between them, for the "${idea.name}" theme of a children's math game. Left: a square app icon of ${idea.icon}, kawaii sticker style, thick dark outline, bold simple shapes, centred. Right: one wide rounded rectangular game button (about 16:9) made of ${idea.keys}, calm and plain in the middle with subtle detail at the edges, no text, no numbers, no symbols on it. Nothing else, no shadows. Output a PNG with a fully transparent background.`;

const slug = (name) => name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/'/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const ideas = [];
let order = 100;
for (const [group, rows] of Object.entries(GROUPS)) {
  for (const [name, mood, background, accent, particleStyle, particleColors, font, price, scene, keys, icon, tagline] of rows) {
    const idea = { id: slug(name), name, group, tagline, mood, background, accent, particleStyle, particleColors, font, price, scene, keys, icon, order };
    idea.colors = derivePalette(idea);
    idea.prompts = { background: backgroundPrompt(idea), assets: assetsPrompt(idea) };
    ideas.push(idea);
    order += 10;
  }
}

const EXISTING = ['sunny', 'ocean', 'meadow', 'candy', 'night', 'aurora', 'golden', 'blossom', 'diamond'];
if (ideas.length !== 100) throw new Error(`expected 100 themes, got ${ideas.length}`);
const ids = ideas.map((i) => i.id);
const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
if (dupes.length) throw new Error(`duplicate ids: ${dupes}`);
const clash = ids.filter((id) => EXISTING.includes(id));
if (clash.length) throw new Error(`clash with existing themes: ${clash}`);

writeFileSync(new URL('../../docs/theme-ideas.json', import.meta.url), JSON.stringify(ideas, null, 2) + '\n');

const lines = [
  'MATH RUN · 100 THEME IDEAS WITH CHATGPT PROMPTS',
  '='.repeat(47),
  '',
  'Each theme needs two ChatGPT pictures (use a new temporary chat per theme):',
  '  Prompt A: the background (tall phone wallpaper)',
  '  Prompt B: the icon and the number-button texture side by side',
  'The easiest way: click "Next theme" in the Studio and paste both pictures there.',
  '',
];
let n = 0;
for (const [group, rows] of Object.entries(GROUPS)) {
  lines.push('', '#'.repeat(60), `# ${group.toUpperCase()} (${rows.length})`, '#'.repeat(60));
  for (const idea of ideas.filter((i) => i.group === group)) {
    n++;
    lines.push(
      '',
      `${String(n).padStart(3, '0')}. ${idea.name}  (${idea.mood}, ${idea.price === 'premium' ? 'premium' : `${idea.price} coins`})`,
      `     Tagline: ${idea.tagline}`,
      '',
      `     Prompt A (background): ${idea.prompts.background}`,
      '',
      `     Prompt B (icon + buttons): ${idea.prompts.assets}`,
      '',
      '-'.repeat(60),
    );
  }
}
writeFileSync(new URL('../../docs/theme-ideas.txt', import.meta.url), lines.join('\r\n') + '\r\n');
console.log(`wrote ${ideas.length} theme ideas in ${Object.keys(GROUPS).length} groups`);
