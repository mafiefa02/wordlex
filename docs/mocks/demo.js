globalThis.DEMO = (function () {
  /*
  Loaded as a classic script, not a module — these are opened straight from
  disk and file:// blocks module loading. Everything hangs off `DEMO`.

  Just enough of a game to feel the motion. Mocks only.

  The real app never scores in the browser — Marks come from the server
  (ADR 0003) and the Answer is not sent until the Game is over. `score` here is
  a copy of packages/domain/src/score.ts so the reveal shows true Marks.
*/

  const ANSWER = { 5: "GREAT", 6: "BARANG", 7: "ARTICLE" };

  // A stand-in Dictionary. Anything outside it demonstrates the Unknown Word state.
  const WORDS = `about above adieu adopt after again agent alert alike alive alone
among angel anger angle apple arena argue arise armor aroma array arrow aside
asset audio audit avoid awake aware badly baker basic beach began begin being
below bench birth black blade blame blank blast bleak blend bless blind block
blood board boost booth bound brain brand brave bread break breed brick bride
brief bring broad broke brown build built burnt burst cabin cable candy canoe
cargo carry catch cause chain chair chalk charm chart chase cheap check chess
chief child chill china choir chose civil claim clash class clean clear clerk
click cliff climb clock close cloth cloud coach coast could count court cover
craft crane crash crazy cream crest cried crime crisp cross crowd crown crude
crush curve cycle daily dance dealt death debut decay delay dense depth doubt
dozen draft drama drank dream dress dried drift drink drive drove dying eager
early earth eight elite empty enemy enjoy enter entry equal error essay event
every exact exist extra faith false fault favor feast fever field fiery fight
final first flame flash fleet flesh flick fling flint float flood floor flour
fluid flush focus force forge forth found frame fraud fresh front frost fruit
fully funny ghost giant given glass gleam globe glory glove going grace grade
grain grand grant grape graph grasp grass grave great greed green greet grief
grill grind groan gross group grove growl guard guess guest guide guilt habit
happy harsh haste hatch haunt heard heart heavy hedge hello hence hobby honey
honor horse hotel house human humor hurry ideal image imply inbox index inner
input irony issue ivory japan jelly jewel joint judge juice knife knock known
label labor large laser later laugh layer learn lease least leave legal lemon
level lever light limit linen liver lobby local lodge logic loose lorry lower
loyal lucky lunar lunch lying magic major maker maple march match maybe mayor
meant medal media mercy merge merit metal meter midst might minor minus mixed
model money month moral motor mount mouse mouth movie music naked nasty naval
nerve never newly night noble noise north noted novel nurse ocean offer often
older olive onset opera orbit order organ other ought outer owner paint panel
panic paper party patch pause peace pearl pedal penny phase phone photo piano
piece pilot pitch pixel place plain plane plant plate plaza point polar porch
pound power press price pride prime print prior prize proof proud prove pulse
punch pupil purse queen query quest queue quick quiet quite quota radar radio
raise rally ranch range rapid ratio reach ready realm rebel refer reign relax
relay renew reply rider ridge rifle right rigid rival river roast robot rocky
rough round route royal rugby ruler rural sadly saint salad salon sauce scale
scare scene scent scope score scout screw sense serve seven shade shaft shake
shall shame shape share sharp sheep sheet shelf shell shift shine shirt shock
shoot shore short shown sight silly since sixth sixty skill skirt slate sleep
slice slide slope small smart smell smile smoke snake sneak solar solid solve
sorry sound south space spare spark speak speed spell spend spent spice spike
spine spite split spoke spoon sport spray squad stack staff stage stain stair
stake stamp stand stare start state steam steel steep steer stern stick still
sting stock stole stone stood stool store storm story stout stove strap straw
stray strip stuck study stuff style sugar suite sunny super surge sweat sweep
sweet swept swift swing sword table taken tally taste teach tempo tenth thank
theft their theme there these thick thief thing think third those three threw
throw thumb tiger tight timer tired title toast today token tooth topic torch
total touch tough tower toxic trace track trade trail train trait trash treat
trend trial tribe trick tried tries truck truly trunk trust truth twice twist
uncle under undue union unify unite unity until upper upset urban usage usual
vague valid value vapor vault venue verse video vigil villa vinyl viral virus
visit vital vivid vocal voice voter wagon waste watch water weary wheel where
which while white whole whose widow width witch woman world worry worse worst
worth would wound wrist write wrong wrote yield young yours youth`
    .split(/\s+/)
    .map((w) => w.toUpperCase());

  const DICTIONARY = new Set([...WORDS, "BARANG", "ARTICLE", "MANGGA", "CILAKA", "KUCING"]);

  function known(word) {
    return DICTIONARY.has(word);
  }

  /** One Mark per Tile. Exact matches take their letter first — see score.ts. */
  function score(guess, answer) {
    const marks = Array.from(guess, () => "absent");
    const unspoken = new Map();
    for (let i = 0; i < answer.length; i += 1) {
      if (guess[i] === answer[i]) marks[i] = "exact";
      else unspoken.set(answer[i], (unspoken.get(answer[i]) ?? 0) + 1);
    }
    for (let i = 0; i < guess.length; i += 1) {
      if (marks[i] === "exact") continue;
      const left = unspoken.get(guess[i]) ?? 0;
      if (left === 0) continue;
      marks[i] = "present";
      unspoken.set(guess[i], left - 1);
    }
    return marks;
  }

  /** The stronger of two Marks, for a keyboard key seen more than once. */
  const RANK = { absent: 0, present: 1, exact: 2 };
  function strongest(a, b) {
    if (!a) return b;
    return RANK[b] > RANK[a] ? b : a;
  }

  const KEYS = [[..."QWERTYUIOP"], [..."ASDFGHJKL"], ["ENTER", ..."ZXCVBNM", "DEL"]];

  const LANGUAGES = [
    { code: "en", name: "English", short: "English", hue: "var(--lang-en)" },
    { code: "id", name: "Bahasa Indonesia", short: "Indonesia", hue: "var(--lang-id)" },
    { code: "su", name: "Basa Sunda", short: "Sunda", hue: "var(--lang-su)" },
    { code: "jv", name: "Basa Jawa", short: "Jawa", hue: "var(--lang-jv)" },
  ];

  const LENGTHS = [5, 6, 7];

  /** One more Guess than the word is long. */
  const budget = (length) => length + 1;

  const REDUCED = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  /** A queue, so two messages in a row do not land on top of each other. */
  function toaster(rail) {
    return (text) => {
      const node = document.createElement("div");
      node.className = "toast";
      node.textContent = text;
      node.setAttribute("role", "status");
      rail.append(node);
      setTimeout(() => {
        node.dataset.leaving = "";
        setTimeout(() => node.remove(), 200);
      }, 1500);
    };
  }

  /** The real apps read this cookie before first paint; here a button is enough. */
  function themeToggle(button) {
    const root = document.documentElement;
    button.addEventListener("click", () => {
      const dark = root.dataset.theme
        ? root.dataset.theme === "dark"
        : matchMedia("(prefers-color-scheme: dark)").matches;
      root.dataset.theme = dark ? "light" : "dark";
    });
  }

  const SUN = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>`;

  return {
    ANSWER,
    known,
    score,
    strongest,
    KEYS,
    LANGUAGES,
    LENGTHS,
    budget,
    REDUCED,
    toaster,
    themeToggle,
    SUN,
  };
})();
