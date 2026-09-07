/*
 * ============================================================
 * STEREOPHONIE — PRODUCT COLORWAY LIBRARY
 * ============================================================
 *
 * One authoritative color-name / storefront-swatch resolver.
 *
 * IMPORTANT:
 * Manufacturers generally publish finish names and product
 * imagery, not official CSS/HEX values for physical finishes.
 * The hexadecimal values here are therefore storefront visual
 * references matched closely to manufacturer presentation.
 *
 * Official manufacturer spelling/capitalization should always
 * be preserved when a branded finish is available.
 * ============================================================
 */

export type ProductColorway = {
  name: string;
  hex: string;
};

export const productColorways: ProductColorway[] = [
  // ----------------------------------------------------------
  // Apple
  // ----------------------------------------------------------
  { name: "Midnight", hex: "#1D2530" },
  { name: "Starlight", hex: "#F0E6D3" },
  { name: "Space Black", hex: "#303033" },
  { name: "Space Gray", hex: "#6B6B6D" },
  { name: "Graphite", hex: "#4B4B4D" },

  { name: "Natural Titanium", hex: "#A69F91" },
  { name: "Black Titanium", hex: "#3C3B3A" },
  { name: "White Titanium", hex: "#E4E2DD" },
  { name: "Blue Titanium", hex: "#3E4855" },
  { name: "Desert Titanium", hex: "#B39A82" },

  { name: "Cosmic Orange", hex: "#D86C38" },
  { name: "Deep Blue", hex: "#314B62" },
  { name: "Ultramarine", hex: "#5967D8" },
  { name: "Teal", hex: "#4E8F88" },
  { name: "Pink", hex: "#E8A5B5" },

  { name: "Pacific Blue", hex: "#365B6D" },
  { name: "Sierra Blue", hex: "#9BB5CE" },
  { name: "Alpine Green", hex: "#576856" },
  { name: "Deep Purple", hex: "#51495C" },
  { name: "Midnight Green", hex: "#43534A" },

  { name: "Product Red", hex: "#C8252C" },
  { name: "Rose Gold", hex: "#B76E79" },
  { name: "Gold", hex: "#D4AF37" },
  { name: "Silver", hex: "#C9C9C9" },

  // ----------------------------------------------------------
  // Samsung
  // ----------------------------------------------------------
  { name: "Titanium Silverblue", hex: "#A8B6BD" },
  { name: "Titanium Black", hex: "#2F3032" },
  { name: "Titanium Gray", hex: "#777773" },
  { name: "Titanium Whitesilver", hex: "#D7D8D3" },
  { name: "Titanium Jetblack", hex: "#202124" },
  { name: "Titanium Jadegreen", hex: "#68796D" },
  { name: "Titanium Pinkgold", hex: "#C9A09A" },

  { name: "Phantom Black", hex: "#242426" },
  { name: "Phantom White", hex: "#F0F0ED" },
  { name: "Phantom Silver", hex: "#B9B7C0" },
  { name: "Phantom Gray", hex: "#6E7073" },
  { name: "Phantom Violet", hex: "#A99BC0" },
  { name: "Phantom Green", hex: "#53645A" },
  { name: "Phantom Navy", hex: "#35445C" },

  { name: "Icyblue", hex: "#C5D6E6" },
  { name: "Silver Shadow", hex: "#B7B8B5" },
  { name: "Navy", hex: "#14213D" },
  { name: "Mint", hex: "#98D8C8" },
  { name: "Cream", hex: "#EFE7D5" },
  { name: "Lavender", hex: "#B9A7E8" },
  { name: "Bora Purple", hex: "#8D79A8" },

  { name: "Awesome Black", hex: "#202124" },
  { name: "Awesome White", hex: "#F3F3F1" },
  { name: "Awesome Blue", hex: "#79A8C9" },
  { name: "Awesome Violet", hex: "#A69AC8" },
  { name: "Awesome Lime", hex: "#C5D97A" },

  // ----------------------------------------------------------
  // Google / Pixel
  // ----------------------------------------------------------
  { name: "Obsidian", hex: "#26272A" },
  { name: "Porcelain", hex: "#E8E2D8" },
  { name: "Hazel", hex: "#7C8175" },
  { name: "Bay", hex: "#6D91B4" },
  { name: "Peony", hex: "#E79BA8" },
  { name: "Wintergreen", hex: "#A9C5B5" },
  { name: "Lemongrass", hex: "#C9CF9E" },
  { name: "Snow", hex: "#F1F1EE" },
  { name: "Stormy Black", hex: "#333438" },
  { name: "Sorta Seafoam", hex: "#A8C4B8" },
  { name: "Rose Quartz", hex: "#D5A5AD" },

  // ----------------------------------------------------------
  // Huawei
  // ----------------------------------------------------------
  { name: "Emerald Green", hex: "#35685C" },
  { name: "Forest Green", hex: "#405C4B" },
  { name: "Spruce Green", hex: "#50675A" },
  { name: "Nebula Gray", hex: "#73777B" },
  { name: "Mystic Silver", hex: "#C1C5C7" },
  { name: "Golden Black", hex: "#292623" },
  { name: "Crystal Blue", hex: "#89BBD1" },
  { name: "Sakura Pink", hex: "#E7B9C1" },
  { name: "Isle Blue", hex: "#7D9DB3" },

  // ----------------------------------------------------------
  // Xiaomi / Redmi family
  // ----------------------------------------------------------
  { name: "Midnight Black", hex: "#222326" },
  { name: "Jade Cyan", hex: "#7CB8B2" },
  { name: "Ocean Cyan", hex: "#70AAB9" },
  { name: "Velvet Black", hex: "#28282A" },
  { name: "Sunrise Orange", hex: "#CF815F" },
  { name: "Moonlight White", hex: "#ECE9E2" },
  { name: "Crystal Silver", hex: "#C3C4C5" },

  // ----------------------------------------------------------
  // Expanded Apple ecosystem
  // ----------------------------------------------------------
  { name: "Blue", hex: "#4C7DA6" },
  { name: "Green", hex: "#6B8F78" },
  { name: "Yellow", hex: "#E7D27C" },
  { name: "Purple", hex: "#9B8DB8" },
  { name: "White", hex: "#F5F5F2" },
  { name: "Black", hex: "#1D1D1F" },
  { name: "Sky Blue", hex: "#A9C9DD" },
  { name: "Light Blue", hex: "#A7C6D9" },
  { name: "Light Green", hex: "#B1C6A5" },
  { name: "Light Pink", hex: "#E8BBC3" },
  { name: "Light Yellow", hex: "#E8DFA5" },
  { name: "Orange", hex: "#E5793B" },
  { name: "Blue Aluminum", hex: "#6E8797" },
  { name: "Pink Aluminum", hex: "#D5A8AF" },
  { name: "Green Aluminum", hex: "#839786" },
  { name: "Silver Aluminum", hex: "#C8C8C5" },

  // ----------------------------------------------------------
  // Samsung extended
  // ----------------------------------------------------------
  { name: "Titanium Blue", hex: "#506879" },
  { name: "Titanium Green", hex: "#607064" },
  { name: "Titanium Orange", hex: "#B56E4B" },
  { name: "Titanium Violet", hex: "#716A80" },
  { name: "Titanium Yellow", hex: "#D5C79E" },
  { name: "Titanium Silver", hex: "#BFC0BC" },
  { name: "Titanium Gold", hex: "#B9A184" },
  { name: "Silverblue", hex: "#9FAFB8" },
  { name: "Marble Gray", hex: "#A6A6A3" },
  { name: "Cobalt Violet", hex: "#77709A" },
  { name: "Amber Yellow", hex: "#E3C55C" },
  { name: "Onyx Black", hex: "#222326" },
  { name: "Jade Green", hex: "#779485" },
  { name: "Sapphire Blue", hex: "#587D9E" },
  { name: "Pink Gold", hex: "#CFA5A2" },
  { name: "Blue Black", hex: "#222B35" },
  { name: "Light Blue", hex: "#A3BDD2" },
  { name: "Light Green", hex: "#B2CAB3" },
  { name: "Yellow", hex: "#E5D47B" },

  // ----------------------------------------------------------
  // Huawei extended
  // ----------------------------------------------------------
  { name: "Black Golden", hex: "#292725" },
  { name: "Rococo White", hex: "#ECE7DC" },
  { name: "Feather-Sand Black", hex: "#302D2A" },
  { name: "Feather-Sand White", hex: "#EAE4DA" },
  { name: "Feather-Sand Purple", hex: "#98889B" },
  { name: "Kunlun Glass Black", hex: "#252628" },
  { name: "Kunlun Glass Orange", hex: "#C8794D" },
  { name: "Provence", hex: "#B69AB9" },
  { name: "Cocoa Gold", hex: "#A98A6C" },
  { name: "Pearl White", hex: "#EEEAE3" },
  { name: "Silver Frost", hex: "#C5C8C8" },
  { name: "Blush Gold", hex: "#CEADA4" },
  { name: "Bamboo Green", hex: "#657B68" },
  { name: "Brocart Black", hex: "#252526" },
  { name: "Brocart White", hex: "#EEECE7" },
  { name: "Brocart Blue", hex: "#627C91" },

  // ----------------------------------------------------------
  // Xiaomi / Redmi / POCO extended
  // ----------------------------------------------------------
  { name: "Titan Gray", hex: "#787B7A" },
  { name: "Titan Blue", hex: "#637F91" },
  { name: "Titan Black", hex: "#292A2C" },
  { name: "Alpine Blue", hex: "#7CA1B8" },
  { name: "Meadow Green", hex: "#7E967B" },
  { name: "Lemon Green", hex: "#B8C979" },
  { name: "Lilac Purple", hex: "#B19CBF" },
  { name: "Aurora Purple", hex: "#A28AB0" },
  { name: "Aurora Green", hex: "#7CA99A" },
  { name: "Aurora Blue", hex: "#80A8C0" },
  { name: "Rock Gray", hex: "#777A7B" },
  { name: "Star Blue", hex: "#5C83A2" },
  { name: "Lake Blue", hex: "#6596AD" },
  { name: "Lavender Purple", hex: "#A99BB8" },
  { name: "Glacier White", hex: "#F1F1ED" },
  { name: "Graphite Gray", hex: "#595B5C" },
  { name: "Moonlight Silver", hex: "#C2C3C2" },
  { name: "Ocean Blue", hex: "#517E99" },
  { name: "Pebble White", hex: "#E9E4DA" },
  { name: "Wild Green", hex: "#788A69" },
  { name: "Nebula Purple", hex: "#927D9C" },
  { name: "Cyber Yellow", hex: "#DCE241" },
  { name: "Cyber Black", hex: "#202123" },
  { name: "Power Black", hex: "#202124" },
  { name: "Cool Blue", hex: "#70A5C4" },
  { name: "Poco Yellow", hex: "#E5D02B" },

  // ----------------------------------------------------------
  // Honor
  // ----------------------------------------------------------
  { name: "Sunrise Gold", hex: "#D2AE82" },
  { name: "Emerald Green", hex: "#3E735E" },
  { name: "Meadow Green", hex: "#739077" },
  { name: "Ocean Cyan", hex: "#6FA7B7" },
  { name: "Crystal Silver", hex: "#C6C8C8" },
  { name: "Midnight Black", hex: "#222326" },
  { name: "Velvet Black", hex: "#29292B" },
  { name: "Glacier Blue", hex: "#8CB6CC" },
  { name: "Cyan Lake", hex: "#70A8AD" },
  { name: "Icelandic Frost", hex: "#C7D7DA" },
  { name: "Phantom Purple", hex: "#8D7A9E" },
  { name: "Phantom Blue", hex: "#6388A1" },
  { name: "Phantom Silver", hex: "#C0C0C2" },
  { name: "Moonlight White", hex: "#EEECE7" },

  // ----------------------------------------------------------
  // Google / Pixel extended
  // ----------------------------------------------------------
  { name: "Charcoal", hex: "#454547" },
  { name: "Chalk", hex: "#E7E5DF" },
  { name: "Sage", hex: "#9EAA99" },
  { name: "Coral", hex: "#E9897E" },
  { name: "Fog", hex: "#BEC6C8" },
  { name: "Iris", hex: "#A9A3C5" },
  { name: "Moonstone", hex: "#96999B" },
  { name: "Polished Obsidian", hex: "#242528" },

  // ----------------------------------------------------------
  // OnePlus
  // ----------------------------------------------------------
  { name: "Emerald Dusk", hex: "#3D7464" },
  { name: "Silky Black", hex: "#28282A" },
  { name: "Flowy Emerald", hex: "#4F7E6B" },
  { name: "Cool Blue", hex: "#72A3BF" },
  { name: "Arctic Dawn", hex: "#D9DADB" },
  { name: "Astral Black", hex: "#212225" },
  { name: "Winter Mist", hex: "#B0A6BC" },
  { name: "Pine Green", hex: "#3D5C4C" },
  { name: "Haze Blue", hex: "#6B8DAA" },
  { name: "Glacial Green", hex: "#79A696" },
  { name: "Lunar Silver", hex: "#BFC0C1" },
  { name: "Aquamarine Green", hex: "#62A695" },
  { name: "Volcanic Black", hex: "#262729" },
  { name: "Jade Wave", hex: "#6B9E8C" },
  { name: "Titan Black", hex: "#2A2B2D" },

  // ----------------------------------------------------------
  // OPPO
  // ----------------------------------------------------------
  { name: "Starry Black", hex: "#24262B" },
  { name: "Glowing Black", hex: "#282A2C" },
  { name: "Glowing Blue", hex: "#6B99B6" },
  { name: "Aqua Blue", hex: "#63A8B6" },
  { name: "Silvery Gray", hex: "#A8AAAC" },
  { name: "Dreamy Purple", hex: "#A18BA8" },
  { name: "Sunset Orange", hex: "#D2845C" },
  { name: "Cosmic Black", hex: "#252628" },
  { name: "Pearl White", hex: "#F0EDE6" },
  { name: "Aurora Green", hex: "#759D8A" },

  // ----------------------------------------------------------
  // Vivo
  // ----------------------------------------------------------
  { name: "Asteroid Black", hex: "#252629" },
  { name: "Breeze Green", hex: "#A3BBA2" },
  { name: "Sunset Dazzle", hex: "#C4918F" },
  { name: "Diamond Glow", hex: "#DAD6CC" },
  { name: "Wave Aqua", hex: "#70AAB4" },
  { name: "Noble Black", hex: "#262628" },
  { name: "Velvet Red", hex: "#A7444B" },
  { name: "Mist Blue", hex: "#88A9BC" },

  // ----------------------------------------------------------
  // Nothing
  // ----------------------------------------------------------
  { name: "Nothing Black", hex: "#202020" },
  { name: "Nothing White", hex: "#EAEAE8" },
  { name: "Nothing Gray", hex: "#A3A3A1" },
  { name: "Nothing Blue", hex: "#536D8B" },

  // ----------------------------------------------------------
  // Motorola
  // ----------------------------------------------------------
  { name: "Infinite Black", hex: "#202123" },
  { name: "Lunar Blue", hex: "#526B87" },
  { name: "Mineral Gray", hex: "#777B7C" },
  { name: "Viva Magenta", hex: "#B44566" },
  { name: "Peach Fuzz", hex: "#D69B7C" },
  { name: "Caneel Bay", hex: "#397D7C" },
  { name: "Soothing Sea", hex: "#8DAA9D" },
  { name: "Black Beauty", hex: "#252426" },
  { name: "Hot Pink", hex: "#D95B91" },
  { name: "Marshmallow Blue", hex: "#91B4C6" },
  { name: "Forest Gray", hex: "#5A625C" },

  // ----------------------------------------------------------
  // Sony
  // ----------------------------------------------------------
  { name: "Khaki Green", hex: "#73765D" },
  { name: "Smoky Pink", hex: "#B68F98" },
  { name: "Platinum Silver", hex: "#BFC0C2" },
  { name: "Ice White", hex: "#ECEDEC" },
  { name: "Midnight Blue", hex: "#283A50" },
  { name: "Forest Gray", hex: "#59605C" },

  // ----------------------------------------------------------
  // ASUS / ROG
  // ----------------------------------------------------------
  { name: "Eclipse Gray", hex: "#55585A" },
  { name: "Moonlight White", hex: "#ECEBE7" },
  { name: "Off Black", hex: "#202123" },
  { name: "Phantom Gray", hex: "#696C6D" },
  { name: "Jaeger Gray", hex: "#64686A" },
  { name: "Volt Green", hex: "#A5D630" },
  { name: "Ponder Blue", hex: "#526A82" },
  { name: "Cool Silver", hex: "#BEC1C2" },
  { name: "Mist Blue", hex: "#86AABD" },
  { name: "Lilac Mist", hex: "#AE9FB9" },

  // ----------------------------------------------------------
  // Acer / Predator
  // ----------------------------------------------------------
  { name: "Abyssal Black", hex: "#202225" },
  { name: "Steel Gray", hex: "#71777A" },
  { name: "Shale Black", hex: "#292B2D" },
  { name: "Pearl White", hex: "#EDECE7" },

  // ----------------------------------------------------------
  // Dell / Alienware
  // ----------------------------------------------------------
  { name: "Dark Metallic Moon", hex: "#323437" },
  { name: "Lunar Light", hex: "#DADAD7" },
  { name: "Interstellar Indigo", hex: "#4B526C" },
  { name: "Platinum Silver", hex: "#C1C2C2" },
  { name: "Titan Gray", hex: "#727576" },
  { name: "Graphite", hex: "#4A4C4E" },

  // ----------------------------------------------------------
  // HP / OMEN
  // ----------------------------------------------------------
  { name: "Shadow Black", hex: "#202123" },
  { name: "Mica Silver", hex: "#A9AAAC" },
  { name: "Natural Silver", hex: "#C4C5C5" },
  { name: "Meteor Silver", hex: "#909497" },
  { name: "Ceramic White", hex: "#EEEDE9" },
  { name: "Performance Blue", hex: "#3974A4" },
  { name: "Atmospheric Blue", hex: "#617A91" },
  { name: "Nightfall Black", hex: "#242527" },
  { name: "Nightfall Black Aluminum", hex: "#303133" },
  { name: "Moonlight Blue", hex: "#536A83" },

  // ----------------------------------------------------------
  // Lenovo / Legion
  // ----------------------------------------------------------
  { name: "Storm Grey", hex: "#6A6D6E" },
  { name: "Luna Grey", hex: "#8A8D8D" },
  { name: "Arctic Grey", hex: "#A6A8A8" },
  { name: "Cloud Grey", hex: "#B4B6B5" },
  { name: "Abyss Blue", hex: "#33495E" },
  { name: "Glacier White", hex: "#ECECE8" },
  { name: "Eclipse Black", hex: "#202123" },
  { name: "Onyx Grey", hex: "#55595B" },
  { name: "Tidal Teal", hex: "#467D7A" },
  { name: "Cosmic Blue", hex: "#425D79" },
  { name: "Luna Grey Aluminum", hex: "#858889" },

  // ----------------------------------------------------------
  // MSI
  // ----------------------------------------------------------
  { name: "Core Black", hex: "#202123" },
  { name: "Cosmos Gray", hex: "#65696B" },
  { name: "Lunar Gray", hex: "#7A7D7E" },
  { name: "Star Blue", hex: "#4E6F8B" },
  { name: "Urban Silver", hex: "#B4B6B7" },
  { name: "Ink Black", hex: "#242527" },
  { name: "Titanium Gray", hex: "#757777" },
  { name: "Pure White", hex: "#F0F0ED" },
  { name: "Rose Pink", hex: "#C98B9C" },

  // ----------------------------------------------------------
  // Razer
  // ----------------------------------------------------------
  { name: "Razer Black", hex: "#191A1C" },
  { name: "Mercury", hex: "#E7E7E4" },
  { name: "Mercury White", hex: "#E8E8E6" },
  { name: "Quartz", hex: "#DDA6B2" },
  { name: "Quartz Pink", hex: "#E7A8B6" },
  { name: "Razer Green", hex: "#44D62C" },

  // ----------------------------------------------------------
  // Logitech
  // ----------------------------------------------------------
  { name: "Graphite", hex: "#4A4B4D" },
  { name: "Off White", hex: "#EEECE6" },
  { name: "Pale Gray", hex: "#B9BAB9" },
  { name: "Rose", hex: "#C9858D" },
  { name: "Lilac", hex: "#B8A6CE" },
  { name: "Mint", hex: "#98D8C8" },
  { name: "Blue", hex: "#507FAA" },

  // ----------------------------------------------------------
  // Corsair
  // ----------------------------------------------------------
  { name: "Corsair Black", hex: "#1D1E20" },
  { name: "Corsair White", hex: "#EAEAE7" },
  { name: "Gunmetal Gray", hex: "#52595D" },
  { name: "Steel Gray", hex: "#71777A" },

  // ----------------------------------------------------------
  // SteelSeries
  // ----------------------------------------------------------
  { name: "Onyx", hex: "#242526" },
  { name: "Snow White", hex: "#ECECEA" },
  { name: "Destiny Blue", hex: "#597A9F" },

  // ----------------------------------------------------------
  // HyperX
  // ----------------------------------------------------------
  { name: "HyperX Black", hex: "#202123" },
  { name: "HyperX White", hex: "#ECECE9" },
  { name: "HyperX Red", hex: "#C53238" },
  { name: "HyperX Pink", hex: "#DD8FA8" },

  // ----------------------------------------------------------
  // Nintendo
  // ----------------------------------------------------------
  { name: "Neon Red", hex: "#E64B4B" },
  { name: "Neon Blue", hex: "#3E7FE8" },
  { name: "Neon Purple", hex: "#8D45E8" },
  { name: "Neon Orange", hex: "#E47737" },
  { name: "Neon Yellow", hex: "#D9E632" },
  { name: "Pastel Pink", hex: "#E8BCC7" },
  { name: "Pastel Yellow", hex: "#E4D997" },
  { name: "Pastel Purple", hex: "#BAA7C9" },
  { name: "Pastel Green", hex: "#A8C5A4" },
  { name: "Nintendo Gray", hex: "#686A6C" },

  // ----------------------------------------------------------
  // PlayStation
  // ----------------------------------------------------------
  { name: "Midnight Black", hex: "#202123" },
  { name: "Cosmic Red", hex: "#A93243" },
  { name: "Nova Pink", hex: "#D15D8B" },
  { name: "Starlight Blue", hex: "#557FA8" },
  { name: "Galactic Purple", hex: "#6E568F" },
  { name: "Volcanic Red", hex: "#A93F42" },
  { name: "Cobalt Blue", hex: "#315FA8" },
  { name: "Sterling Silver", hex: "#BFC0C2" },
  { name: "Chroma Indigo", hex: "#58639C" },
  { name: "Chroma Pearl", hex: "#E8E7E2" },
  { name: "Chroma Teal", hex: "#4C9891" },

  // ----------------------------------------------------------
  // Xbox
  // ----------------------------------------------------------
  { name: "Robot White", hex: "#EEEEEB" },
  { name: "Carbon Black", hex: "#242424" },
  { name: "Shock Blue", hex: "#3974CF" },
  { name: "Pulse Red", hex: "#C23F45" },
  { name: "Electric Volt", hex: "#C7E336" },
  { name: "Deep Pink", hex: "#D04E83" },
  { name: "Velocity Green", hex: "#58A85B" },
  { name: "Astral Purple", hex: "#745D94" },
  { name: "Daystrike Camo", hex: "#9C444C" },
  { name: "Mineral Camo", hex: "#627D84" },

  // ----------------------------------------------------------
  // JBL
  // ----------------------------------------------------------
  { name: "JBL Black", hex: "#222326" },
  { name: "JBL White", hex: "#EEEDE9" },
  { name: "JBL Blue", hex: "#397FA7" },
  { name: "JBL Red", hex: "#C83C3D" },
  { name: "JBL Pink", hex: "#D98FA5" },
  { name: "JBL Purple", hex: "#806690" },
  { name: "JBL Teal", hex: "#4B9690" },
  { name: "JBL Camo", hex: "#65705A" },

  // ----------------------------------------------------------
  // Bose
  // ----------------------------------------------------------
  { name: "Triple Black", hex: "#222326" },
  { name: "White Smoke", hex: "#ECEAE5" },
  { name: "Sandstone", hex: "#BCAE99" },
  { name: "Cypress Green", hex: "#557161" },
  { name: "Chilled Lilac", hex: "#AA9DBA" },
  { name: "Moonstone Blue", hex: "#718C9E" },
  { name: "Petal Pink", hex: "#D8A2AF" },
  { name: "Diamond", hex: "#E3E2DE" },

  // ----------------------------------------------------------
  // Beats
  // ----------------------------------------------------------
  { name: "Matte Black", hex: "#1C1C1E" },
  { name: "Stone Purple", hex: "#8C7F98" },
  { name: "Sage Gray", hex: "#919C91" },
  { name: "Transparent", hex: "transparent" },
  { name: "Cloud Pink", hex: "#E5B8C2" },
  { name: "Deep Brown", hex: "#574237" },
  { name: "Navy", hex: "#14213D" },
  { name: "Statement Red", hex: "#BA3138" },
  { name: "Bolt Black", hex: "#222326" },

  // ----------------------------------------------------------
  // Marshall
  // ----------------------------------------------------------
  { name: "Marshall Black", hex: "#222222" },
  { name: "Marshall Cream", hex: "#DDD2BC" },
  { name: "Marshall Brown", hex: "#665042" },
  { name: "Brass", hex: "#A58654" },

  // ----------------------------------------------------------
  // Garmin / fitness / wearables
  // ----------------------------------------------------------
  { name: "Slate", hex: "#596168" },
  { name: "Soft Gold", hex: "#C9AD7F" },
  { name: "Cream Gold", hex: "#C9B38C" },
  { name: "Whitestone", hex: "#E8E5DD" },
  { name: "Black Slate", hex: "#343638" },
  { name: "French Gray", hex: "#94928E" },
  { name: "Moss", hex: "#738066" },
  { name: "Orchid", hex: "#A56A9D" },
  { name: "Amp Yellow", hex: "#D4D83A" },
  { name: "Flame Red", hex: "#C7473D" },
  { name: "Aqua", hex: "#55ABB2" },
  { name: "Granite Blue", hex: "#566F82" },
  { name: "Black Aluminum", hex: "#303234" },
  { name: "Lunar White", hex: "#E9E5DB" },
  { name: "Platinum Silver", hex: "#BFC0C2" },
  { name: "Bay Blue", hex: "#557E9E" },

  // ----------------------------------------------------------
  // Common / cross-brand finishes
  // ----------------------------------------------------------
  { name: "Black", hex: "#111111" },
  { name: "Jet Black", hex: "#0A0A0A" },
  { name: "Matte Black", hex: "#1C1C1E" },
  { name: "Glossy Black", hex: "#171717" },
  { name: "Carbon Black", hex: "#242424" },
  { name: "Charcoal", hex: "#454547" },

  { name: "Gray", hex: "#808083" },
  { name: "Dark Gray", hex: "#555558" },
  { name: "Light Gray", hex: "#B8B8BA" },
  { name: "Platinum", hex: "#D5D2CB" },

  { name: "White", hex: "#F7F7F5" },
  { name: "Pearl White", hex: "#F4F1EA" },

  { name: "Blue", hex: "#2F6BFF" },
  { name: "Sky Blue", hex: "#7CC7F2" },
  { name: "Ice Blue", hex: "#B5DCEB" },
  { name: "Royal Blue", hex: "#3155A6" },
  { name: "Cobalt Blue", hex: "#315FA8" },
  { name: "Ocean Blue", hex: "#3E7795" },
  { name: "Aqua Blue", hex: "#58B6C9" },

  { name: "Green", hex: "#4E8B57" },
  { name: "Mint Green", hex: "#A3D9C9" },
  { name: "Olive", hex: "#727A3E" },
  { name: "Olive Green", hex: "#68704A" },

  { name: "Purple", hex: "#7651C9" },
  { name: "Violet", hex: "#7759A6" },
  { name: "Lilac", hex: "#B8A6CE" },

  { name: "Red", hex: "#D92D20" },
  { name: "Crimson", hex: "#A9232D" },
  { name: "Burgundy", hex: "#6B1D2A" },

  { name: "Orange", hex: "#F57C00" },
  { name: "Burnt Orange", hex: "#C8672A" },

  { name: "Yellow", hex: "#F4C430" },
  { name: "Mustard", hex: "#FDB73E" },

  { name: "Beige", hex: "#D8C3A5" },
  { name: "Sand", hex: "#CDBA96" },
  { name: "Ivory", hex: "#ECE5D5" },

  { name: "Clear", hex: "transparent" },
];

function identity(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

const colorwayByIdentity = new Map(
  productColorways.map((colorway) => [identity(colorway.name), colorway]),
);

/*
 * Historical / malformed aliases that already exist in the
 * Stereophonie admin preset library or may exist in saved data.
 *
 * They resolve without requiring a destructive database migration.
 */
const aliases: Record<string, string> = {
  naturaltitanium: "Natural Titanium",
  pacificblue: "Pacific Blue",
  productred: "Product Red",

  phantomblack: "Phantom Black",
  phantomwhite: "Phantom White",
  phantomsilver: "Phantom Silver",
  phantomgray: "Phantom Gray",
  phantomviolet: "Phantom Violet",
  phantomgreen: "Phantom Green",
  phantomnavy: "Phantom Navy",

  awesomeblack: "Awesome Black",
  awesomewhite: "Awesome White",
  awesomeblue: "Awesome Blue",
  awesomeviolet: "Awesome Violet",
  awesomelime: "Awesome Lime",

  emeraldgreen: "Emerald Green",
  crystalblue: "Crystal Blue",

  stormyblack: "Stormy Black",
  cobaltblue: "Cobalt Blue",

  cherryred: "Cherry Red",
  cherrypink: "Cherry Pink",

  velvetblack: "Velvet Black",
  aurorapurple: "Aurora Purple",
  astralblack: "Astral Black",
  arcticdawn: "Arctic Dawn",
  forestemerald: "Forest Emerald",

  cosmicorange: "Cosmic Orange",
  goldenyellow: "Golden Yellow",
  powderblue: "Powder Blue",
  pastelpurple: "Pastel Purple",
  pastelpink: "Pastel Pink",
  coffeebrown: "Coffee Brown",
  racingred: "Racing Red",

  titaniumsilverblue: "Titanium Silverblue",
  titaniumwhitesilver: "Titanium Whitesilver",
  titaniumjetblack: "Titanium Jetblack",
  titaniumjadegreen: "Titanium Jadegreen",
  titaniumpinkgold: "Titanium Pinkgold",
};

export function canonicalizeProductColorwayName(value: unknown) {
  const trimmed = String(value ?? "").trim();

  if (!trimmed) {
    return "";
  }

  const normalized = identity(trimmed);

  const alias = aliases[normalized];

  if (alias) {
    return alias;
  }

  const known = colorwayByIdentity.get(normalized);

  if (known) {
    return known.name;
  }

  /*
   * Unknown/custom admin colors remain allowed.
   * At minimum enforce the store rule that the name starts
   * with a capital letter.
   */
  return trimmed.charAt(0).toLocaleUpperCase() + trimmed.slice(1);
}

export function productColorwayHex(value: unknown) {
  const canonical = canonicalizeProductColorwayName(value);

  if (!canonical) {
    return null;
  }

  return colorwayByIdentity.get(identity(canonical))?.hex ?? null;
}

export function normalizeProductColorway(
  colorway: ProductColorway,
): ProductColorway {
  const name = canonicalizeProductColorwayName(colorway.name);

  return {
    name,
    hex: productColorwayHex(name) ?? colorway.hex,
  };
}
