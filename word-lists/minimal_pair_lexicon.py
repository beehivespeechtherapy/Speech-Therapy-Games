# Minimal pair word lists: at least 12 pairs per (sound_a, sound_b, position).
# Key: (sound_a, sound_b, position) — sound_a is "target", sound_b is "contrast".
# Pairs are (word_with_sound_a, word_with_sound_b). Use common, image-friendly words.
# Sound names match index: K, T, G, D, F, V, S, Z, SH, CH, J, TH, P, B, L, R, W, Y, M, N, NG, etc.

def _pairs(*pairs):
    return list(pairs)

LEXICON = {
    # --- Fronting/Backing: K-T, G-D, T-K, D-G ---
    ("K", "T", "Initial"): _pairs(
        ("can", "tan"), ("cap", "tap"), ("cape", "tape"), ("car", "tar"), ("cart", "tart"),
        ("cod", "todd"), ("code", "toad"), ("cop", "top"), ("core", "tore"), ("cub", "tub"),
        ("key", "tea"), ("kite", "tight"), ("cold", "told"), ("coat", "tote"), ("came", "tame"),
    ),
    ("K", "T", "Final"): _pairs(
        ("back", "bat"), ("beak", "beet"), ("bike", "bite"), ("hike", "height"), ("kick", "kit"),
        ("lick", "lit"), ("lock", "lot"), ("pick", "pit"), ("puck", "putt"), ("rack", "rat"),
        ("sack", "sat"), ("stick", "strict"), ("duck", "duct"), ("book", "but"),
    ),
    ("K", "T", "Medial"): _pairs(
        ("baker", "batter"), ("biking", "biting"), ("hiker", "hitter"), ("poker", "potter"),
        ("waking", "waiting"), ("bacon", "baton"), ("soccer", "sotter"), ("rocket", "rotor"),
        ("token", "totem"), ("liquor", "litter"), ("tackle", "tattle"), ("picket", "pitted"),
    ),
    ("T", "K", "Initial"): None,  # same pairs, reversed; generator will flip
    ("T", "K", "Medial"): None,
    ("T", "K", "Final"): None,
    ("G", "D", "Initial"): _pairs(
        ("game", "dame"), ("gate", "date"), ("gone", "dawn"), ("gear", "deer"), ("go", "doe"),
        ("gun", "done"), ("got", "dot"), ("gown", "down"), ("gust", "dust"), ("guy", "dye"),
        ("gum", "dumb"), ("gap", "dap"), ("gale", "dale"), ("goat", "dote"), ("gulp", "dulp"),
    ),
    ("G", "D", "Final"): _pairs(
        ("bag", "bad"), ("beg", "bed"), ("bug", "bud"), ("dig", "did"), ("egg", "Ed"),
        ("hag", "had"), ("leg", "lead"), ("mug", "mud"), ("rag", "rad"), ("tag", "tad"),
        ("rug", "rud"), ("tug", "tud"), ("jog", "jod"), ("log", "lod"),
    ),
    ("G", "D", "Medial"): _pairs(
        ("tiger", "tider"), ("wagon", "wadon"), ("dragon", "dradon"), ("magnet", "madnet"),
        ("finger", "finder"), ("eagle", "eadle"), ("bugle", "budle"), ("angle", "andle"),
        ("jungle", "jundle"), ("single", "sindle"), ("jelly", "delly"), ("holy", "doly"),
    ),
    ("D", "G", "Initial"): None,
    ("D", "G", "Medial"): None,
    ("D", "G", "Final"): None,
    # --- Stopping: F-P, F-B, F-T, etc. (fricative vs stop) ---
    ("F", "P", "Initial"): _pairs(
        ("fan", "pan"), ("fat", "pat"), ("fig", "pig"), ("fin", "pin"), ("fit", "pit"),
        ("food", "pood"), ("foot", "put"), ("four", "pour"), ("fox", "pox"), ("fun", "pun"),
        ("fair", "pair"), ("feel", "peel"), ("fight", "pite"), ("fill", "pill"), ("fine", "pine"),
    ),
    ("F", "P", "Final"): _pairs(
        ("cough", "cop"), ("puff", "pup"), ("stuff", "stub"), ("half", "hap"), ("leaf", "leap"),
        ("safe", "sape"), ("knife", "nipe"), ("wife", "wipe"), ("loaf", "lope"), ("calf", "cap"),
        ("chief", "cheep"), ("beef", "beep"), ("reef", "reep"), ("roof", "roup"), ("if", "ip"),
    ),
    ("F", "P", "Medial"): _pairs(
        ("coffee", "copy"), ("muffin", "muppin"), ("sofa", "sopa"), ("refuse", "repuse"),
        ("afford", "apord"), ("buffer", "bupper"), ("offer", "opper"), ("suffer", "supper"),
        ("different", "different"), ("office", "oppice"), ("affect", "apect"), ("defend", "depend"),
    ),
    ("V", "B", "Initial"): _pairs(
        ("van", "ban"), ("vest", "best"), ("vroom", "broom"), ("vote", "boat"), ("vase", "base"),
        ("veil", "bale"), ("very", "berry"), ("vow", "bow"), ("vent", "bent"), ("vat", "bat"),
        ("view", "boo"), ("vine", "bine"), ("vet", "bet"), ("vile", "bile"), ("volt", "bolt"),
    ),
    ("V", "B", "Final"): _pairs(
        ("carve", "carb"), ("curve", "curb"), ("wave", "web"), ("drive", "drib"), ("five", "fib"),
        ("give", "gib"), ("grave", "grab"), ("live", "lib"), ("love", "lobe"), ("nerve", "nub"),
        ("save", "sab"), ("leave", "leb"), ("dove", "dob"), ("have", "hab"),
    ),
    ("V", "B", "Medial"): _pairs(
        ("over", "ober"), ("river", "riber"), ("never", "neber"), ("heavy", "heaby"),
        ("seven", "seben"), ("even", "eben"), ("cover", "cober"), ("lever", "leber"),
        ("fever", "fever"), ("silver", "silber"), ("travel", "trabel"), ("navy", "naby"),
    ),
    ("S", "T", "Initial"): _pairs(
        ("sip", "tip"), ("sack", "tack"), ("sad", "tad"), ("sank", "tank"), ("seal", "teal"),
        ("seat", "teat"), ("see", "tea"), ("sigh", "tie"), ("sight", "tight"), ("sill", "till"),
        ("sink", "tink"), ("soap", "tope"), ("sock", "tock"), ("sow", "toe"), ("sue", "two"),
    ),
    ("S", "T", "Final"): _pairs(
        ("bus", "but"), ("face", "fate"), ("grace", "grate"), ("ice", "height"), ("lace", "late"),
        ("nice", "night"), ("race", "rate"), ("rice", "write"), ("slice", "slight"), ("place", "plate"),
        ("dice", "diet"), ("mice", "might"), ("once", "won't"), ("peace", "peat"), ("purse", "burst"),
    ),
    ("S", "T", "Medial"): _pairs(
        ("basin", "batin"), ("bison", "biton"), ("lesson", "leton"), ("mason", "maton"),
        ("motion", "motton"), ("racing", "rating"), ("recent", "retent"), ("scent", "sent"),
        ("fancy", "fanty"), ("dancer", "danter"), ("pencil", "pentil"), ("receive", "reteive"),
    ),
    ("S", "SH", "Initial"): _pairs(
        ("sip", "ship"), ("sock", "shock"), ("sack", "shack"), ("see", "she"), ("sell", "shell"),
        ("sign", "shine"), ("sow", "show"), ("sin", "shin"), ("sue", "shoe"), ("sop", "shop"),
        ("sake", "shake"), ("sore", "shore"), ("sugar", "sure"), ("same", "shame"), ("sort", "short"),
    ),
    ("SH", "S", "Initial"): None,
    ("TH", "F", "Initial"): _pairs(
        ("thin", "fin"), ("think", "fink"), ("thumb", "fum"), ("thank", "fank"), ("thick", "fick"),
        ("thigh", "fie"), ("thief", "feef"), ("thorn", "forn"), ("three", "free"), ("throw", "fro"),
        ("thud", "fud"), ("thumb", "fum"), ("thaw", "faw"), ("theme", "feem"), ("thump", "fump"),
    ),
    ("TH", "F", "Final"): _pairs(
        ("mouth", "mouf"), ("bath", "baf"), ("path", "paf"), ("teeth", "teef"), ("cloth", "clof"),
        ("wreath", "wreaf"), ("growth", "grof"), ("health", "healf"), ("faith", "faif"), ("south", "souf"),
        ("oath", "oaf"), ("booth", "boof"), ("moth", "mof"), ("death", "deaf"), ("width", "widf"),
    ),
    ("TH", "F", "Medial"): _pairs(
        ("nothing", "nofing"), ("something", "somefing"), ("author", "aufor"), ("birthday", "birfday"),
        ("healthy", "healfy"), ("python", "pyfon"), ("ether", "efer"), ("leather", "leaffer"),
        ("weather", "weaffer"), ("feather", "feaffer"), ("together", "togefer"), ("other", "ofer"),
    ),
    ("F", "TH", "Initial"): None,
    ("F", "TH", "Final"): None,
    ("F", "TH", "Medial"): None,
    # --- Gliding: L-W, R-W, L-Y, R-Y ---
    ("L", "W", "Initial"): _pairs(
        ("light", "white"), ("lane", "wane"), ("lock", "wok"), ("lead", "weed"), ("let", "wet"),
        ("lake", "wake"), ("low", "woe"), ("leak", "week"), ("line", "wine"), ("lip", "whip"),
        ("lent", "went"), ("loaf", "woaf"), ("lace", "waist"), ("lamp", "wamp"), ("lunch", "wunch"),
    ),
    ("L", "W", "Medial"): _pairs(
        ("yellow", "yewow"), ("balloon", "bawoon"), ("pillow", "piwow"), ("follow", "folwow"),
        ("belly", "bewy"), ("silly", "siwy"), ("holly", "howy"), ("valley", "vawley"),
        ("college", "cowlege"), ("million", "miwion"), ("billion", "biwion"), ("melody", "mewody"),
    ),
    ("L", "W", "Final"): _pairs(
        ("ball", "baw"), ("call", "caw"), ("fall", "faw"), ("hall", "haw"), ("mall", "maw"),
        ("tall", "taw"), ("wall", "waw"), ("well", "wew"), ("pill", "piw"), ("will", "wiw"),
        ("bell", "bew"), ("sell", "sew"), ("tell", "tew"), ("hill", "hiw"), ("mill", "miw"),
    ),
    ("R", "W", "Initial"): _pairs(
        ("red", "wed"), ("run", "won"), ("rag", "wag"), ("ram", "wam"), ("rat", "wat"),
        ("rip", "wip"), ("road", "woad"), ("rock", "wok"), ("rope", "wope"), ("rose", "woes"),
        ("row", "woe"), ("rug", "wag"), ("rust", "wust"), ("rain", "wain"), ("ring", "wing"),
    ),
    ("R", "W", "Medial"): _pairs(
        ("berry", "bewy"), ("carry", "cawy"), ("marry", "mawy"), ("sorry", "sowy"),
        ("hurry", "huwy"), ("worry", "wowy"), ("merry", "mewy"), ("ferry", "fewy"),
        ("orange", "owange"), ("forest", "fowest"), ("story", "stowy"), ("around", "awound"),
    ),
    ("R", "W", "Final"): _pairs(
        ("car", "caw"), ("far", "faw"), ("bar", "baw"), ("star", "staw"), ("jar", "jaw"),
        ("door", "doe"), ("four", "foe"), ("sore", "soe"), ("more", "moe"), ("pour", "poe"),
        ("bear", "bae"), ("hair", "hae"), ("pair", "pae"), ("chair", "chae"), ("fair", "fae"),
    ),
    ("L", "Y", "Initial"): _pairs(
        ("light", "yight"), ("lip", "yip"), ("let", "yet"), ("look", "yook"), ("love", "yove"),
        ("low", "yo"), ("lake", "yake"), ("lamp", "yamp"), ("lunch", "yunch"), ("list", "yist"),
        ("lime", "yime"), ("lamb", "yamb"), ("leaf", "yeaf"), ("leak", "yeak"), ("loaf", "yoaf"),
    ),
    ("R", "Y", "Initial"): _pairs(
        ("red", "yed"), ("run", "yun"), ("rag", "yag"), ("ram", "yam"), ("rat", "yat"),
        ("rip", "yip"), ("road", "yoad"), ("rock", "yock"), ("rope", "yope"), ("rose", "yose"),
        ("row", "yo"), ("rug", "yug"), ("rust", "yust"), ("rain", "yain"), ("ring", "ying"),
    ),
    ("W", "L", "Initial"): None,
    ("W", "R", "Initial"): None,
    ("Y", "L", "Initial"): None,
    ("Y", "R", "Initial"): None,
    # --- Deaffrication: CH-SH, CH-T, J-D, J-Z ---
    ("CH", "SH", "Initial"): _pairs(
        ("cheap", "sheep"), ("cheese", "sheese"), ("cheer", "sheer"), ("chest", "shest"),
        ("chick", "shick"), ("chin", "shin"), ("chip", "ship"), ("chop", "shop"),
        ("chore", "shore"), ("chug", "shug"), ("chum", "shum"), ("chute", "shoot"),
        ("chair", "share"), ("chalk", "shalk"), ("chase", "shase"),
    ),
    ("CH", "T", "Initial"): _pairs(
        ("cheap", "teap"), ("cheek", "teek"), ("cheese", "teese"), ("cherry", "terry"),
        ("chest", "test"), ("chick", "tick"), ("chin", "tin"), ("chip", "tip"),
        ("chop", "top"), ("chore", "tore"), ("chug", "tug"), ("chum", "tum"),
        ("chair", "tear"), ("chalk", "talk"), ("chase", "tase"),
    ),
    ("J", "D", "Initial"): _pairs(
        ("jail", "dale"), ("jam", "dam"), ("jar", "dar"), ("jaw", "daw"), ("jeep", "deep"),
        ("jet", "debt"), ("jig", "dig"), ("jim", "dim"), ("job", "dob"), ("jog", "dog"),
        ("jot", "dot"), ("joy", "doy"), ("jump", "dump"), ("junk", "dunk"), ("just", "dust"),
    ),
    ("J", "Z", "Initial"): _pairs(
        ("jail", "zail"), ("jam", "zam"), ("jar", "zar"), ("jaw", "zaw"), ("jeep", "zeep"),
        ("jet", "zet"), ("jig", "zig"), ("jim", "zim"), ("job", "zob"), ("jog", "zog"),
        ("jot", "zot"), ("joy", "zoy"), ("jump", "zump"), ("junk", "zunk"), ("just", "zust"),
    ),
    ("SH", "CH", "Initial"): None,
    ("T", "CH", "Initial"): None,
    ("D", "J", "Initial"): None,
    ("Z", "J", "Initial"): None,
    # --- Denasalization: M-B, N-D, NG-G ---
    ("M", "B", "Initial"): _pairs(
        ("mail", "bail"), ("make", "bake"), ("man", "ban"), ("map", "bap"), ("mat", "bat"),
        ("meal", "beal"), ("meat", "beat"), ("men", "ben"), ("mess", "best"), ("mice", "bice"),
        ("might", "bite"), ("moon", "boon"), ("mop", "bop"), ("more", "bore"), ("mug", "bug"),
    ),
    ("M", "B", "Final"): _pairs(
        ("dime", "dibe"), ("game", "gabe"), ("ham", "hab"), ("jam", "jab"), ("lamb", "lab"),
        ("ram", "rab"), ("same", "sabe"), ("tame", "tabe"), ("time", "tibe"), ("comb", "cob"),
        ("bomb", "bob"), ("crumb", "crub"), ("dumb", "dub"), ("thumb", "thub"), ("climb", "clib"),
    ),
    ("N", "D", "Initial"): _pairs(
        ("night", "dight"), ("no", "doe"), ("nose", "doze"), ("not", "dot"), ("nut", "dut"),
        ("nap", "dap"), ("net", "det"), ("nick", "dick"), ("nill", "dill"), ("nip", "dip"),
        ("nod", "dod"), ("none", "done"), ("noon", "doon"), ("nope", "dope"), ("nor", "dor"),
    ),
    ("N", "D", "Final"): _pairs(
        ("ban", "bad"), ("bean", "bead"), ("bin", "bid"), ("bone", "bode"), ("can", "cad"),
        ("fan", "fad"), ("man", "mad"), ("pan", "pad"), ("ran", "rad"), ("tan", "tad"),
        ("ten", "ted"), ("tin", "tid"), ("ton", "tod"), ("win", "wid"), ("pin", "pid"),
    ),
    ("NG", "G", "Final"): _pairs(
        ("bang", "bag"), ("bring", "brig"), ("cling", "clig"), ("ding", "dig"), ("hang", "hag"),
        ("king", "kig"), ("long", "log"), ("ping", "pig"), ("ring", "rig"), ("sing", "sig"),
        ("spring", "sprig"), ("sting", "stig"), ("string", "strig"), ("swing", "swig"), ("wing", "wig"),
    ),
    ("B", "M", "Initial"): None,
    ("D", "N", "Initial"): None,
    ("G", "NG", "Final"): None,
    # --- Voicing: P-B, T-D, K-G (prevocalic/final) ---
    ("P", "B", "Initial"): _pairs(
        ("pan", "ban"), ("pat", "bat"), ("pig", "big"), ("pin", "bin"), ("pit", "bit"),
        ("pad", "bad"), ("pack", "back"), ("peg", "beg"), ("pet", "bet"), ("pie", "by"),
        ("pool", "bool"), ("pop", "bop"), ("pot", "bot"), ("puff", "buff"), ("pull", "bull"),
    ),
    ("P", "B", "Final"): _pairs(
        ("cap", "cab"), ("cup", "cub"), ("hop", "hub"), ("lap", "lab"), ("nap", "nab"),
        ("pop", "pob"), ("rap", "rab"), ("rip", "rib"), ("sap", "sab"), ("tap", "tab"),
        ("tip", "tib"), ("top", "tob"), ("trap", "trab"), ("wrap", "wrab"), ("slap", "slab"),
    ),
    ("T", "D", "Initial"): _pairs(
        ("tan", "dan"), ("tap", "dap"), ("tart", "dart"), ("tea", "D"), ("teal", "deal"),
        ("ten", "den"), ("tie", "die"), ("till", "dill"), ("tin", "din"), ("toe", "doe"),
        ("toast", "doast"), ("tone", "done"), ("town", "down"), ("two", "do"), ("tug", "dug"),
    ),
    ("T", "D", "Final"): _pairs(
        ("bat", "bad"), ("bet", "bed"), ("bit", "bid"), ("boot", "booed"), ("but", "bud"),
        ("cat", "cad"), ("fat", "fad"), ("hat", "had"), ("heat", "heed"), ("hit", "hid"),
        ("hot", "hod"), ("knot", "nod"), ("mat", "mad"), ("met", "med"), ("pat", "pad"),
    ),
    ("K", "G", "Initial"): _pairs(
        ("can", "gan"), ("cap", "gap"), ("car", "gar"), ("card", "guard"), ("cast", "gast"),
        ("cave", "gave"), ("coat", "goat"), ("cold", "gold"), ("came", "game"), ("key", "gee"),
        ("kick", "gick"), ("kid", "gid"), ("kill", "gill"), ("kite", "gite"), ("cub", "gub"),
    ),
    ("K", "G", "Final"): _pairs(
        ("back", "bag"), ("pick", "pig"), ("pack", "pag"), ("sack", "sag"), ("tack", "tag"),
        ("wick", "wig"), ("lock", "log"), ("rock", "rog"), ("sock", "sog"), ("duck", "dug"),
        ("truck", "trug"), ("stick", "stig"), ("black", "blag"), ("clock", "clog"), ("crack", "crag"),
    ),
    ("B", "P", "Initial"): None,
    ("B", "P", "Final"): None,
    ("D", "T", "Initial"): None,
    ("D", "T", "Final"): None,
    ("G", "K", "Initial"): None,
    ("G", "K", "Final"): None,
}

def get_pairs(sound_a: str, sound_b: str, position: str):
    """Return list of (word1, word2) for target sound_a vs contrast sound_b. If only reverse is in lexicon, flip."""
    key = (sound_a.upper(), sound_b.upper(), position)
    if key in LEXICON and LEXICON[key] is not None:
        return LEXICON[key][:20]  # cap at 20 for now
    rev = (sound_b.upper(), sound_a.upper(), position)
    if rev in LEXICON and LEXICON[rev] is not None:
        return [(b, a) for (a, b) in LEXICON[rev][:20]]
    return []
