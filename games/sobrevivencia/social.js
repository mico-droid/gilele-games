// Apagão: Sobreviva — coisas de jogar junto, iguais nos dois modos:
//   • mochila nas costas de todo jogador que tem itens (presença "bg");
//   • largar item no chão (fica no mundo; qualquer um pode pegar) — mensagens gd/gp/gq/gl;
//   • troca de itens entre jogadores, sem texto livre (ECA Digital) — mensagens to/tc/ta/tx.
// bag = { list(), has(k), take(k) → n, give(k, n), fits(k), label(k), emoji(k), slots() }
import { THREE, part, h, t, toast, Audio } from "../../engine/ez.js";
import { wearPack } from "./menu.js";

export function setupSocial({ world, room, remotes, me, bag, openMenu, busy, onGround }) {
  const S = world.scene, ground = new Map();
  let seq = 0, pending = null, pendT = 0, lastBg = -1;
  const nameOf = (id) => { const r = remotes.get(id); return (r && r.ch.look && r.ch.look.n) || t("tr_player"); };
  const toMe = (d) => d && d.to === room.myId;
  const send = (type, d) => { if (room.connected) room.send(type, d); };

  // ------------------------------------------------------------ itens no chão
  function emojiSprite(e) {
    const cv = document.createElement("canvas"); cv.width = cv.height = 64; const c = cv.getContext("2d");
    c.font = "48px sans-serif"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(e, 32, 36);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), depthTest: false })); sp.scale.set(0.9, 0.9, 1); return sp;
  }
  function putGround(it, tell) {
    if (ground.has(it.id) || !bag.emoji(it.k)) return;
    const g = new THREE.Group(); g.position.set(it.x, 0, it.z); S.add(g);
    part(0.5, 0.36, 0.5, "#a16207", 0, 0.18, 0, g); part(0.54, 0.06, 0.54, "#713f12", 0, 0.37, 0, g);
    const sp = emojiSprite(bag.emoji(it.k)); sp.position.y = 1; g.add(sp);
    ground.set(it.id, Object.assign({ g, sp }, it));
    if (tell) send("gd", { id: it.id, k: it.k, n: it.n, x: it.x, z: it.z });
    persist();
  }
  function takeGround(id, tell) {
    const it = ground.get(id); if (!it) return null;
    S.remove(it.g); it.sp.material.map.dispose(); ground.delete(id);
    if (tell) send("gp", { id });
    persist(); return it;
  }
  const dump = () => [...ground.values()].map(({ id, k, n, x, z }) => ({ id, k, n, x, z }));
  const persist = () => onGround && onGround(dump());
  function drop(k) {
    if (!bag.has(k)) return false;
    const n = bag.take(k);
    putGround({ id: (room.myId || "me") + "-" + Date.now().toString(36) + "-" + seq++, k, n, x: me.x + Math.sin(me.rot) * 1.5, z: me.z + Math.cos(me.rot) * 1.5 }, true);
    Audio.play("pop"); toast(t("gr_dropped", { x: bag.label(k) }), 2200);
    return true;
  }
  function nearGround() {
    let best = null, bd = 1.9;
    for (const it of ground.values()) { const d = Math.hypot(it.x - me.x, it.z - me.z); if (d < bd) { bd = d; best = it; } }
    return best;
  }
  function pickGround(it) {
    if (!bag.fits(it.k)) { toast(t("full"), 3000); Audio.play("wrong"); return; }
    if (!takeGround(it.id, true)) return;
    bag.give(it.k, it.n); Audio.play("coin"); toast("+ " + bag.label(it.k), 1200);
  }
  room.on("gd", (d) => { if (d && d.id && typeof d.x === "number") putGround({ id: String(d.id), k: d.k, n: +d.n || 1, x: d.x, z: d.z }, false); });
  room.on("gp", (d) => { if (d && d.id) takeGround(String(d.id), false); });
  room.on("gq", () => { if (room.isHost) send("gl", { items: dump() }); });
  room.on("gl", (d) => { if (d && Array.isArray(d.items)) d.items.slice(0, 60).forEach((it) => putGround({ id: String(it.id), k: it.k, n: +it.n || 1, x: +it.x, z: +it.z }, false)); });
  room.onStatus((k) => { if (k === "room" && !room.isHost) setTimeout(() => send("gq", {}), 800); });

  // ------------------------------------------------------------ troca
  function nearPlayer() {
    if (!room.connected) return null;
    let best = null, bd = 3;
    for (const [id, r] of remotes.map) { const d = Math.hypot(r.x - me.x, r.z - me.z); if (d < bd) { bd = d; best = id; } }
    return best;
  }
  const clearPending = () => { pending = null; };
  const cancel = (id, why) => { send("tx", { to: id, why }); clearPending(); };
  function openTrade(id) {
    const who = nameOf(id);
    openMenu(() => {
      const ks = bag.list();
      return { title: "🤝 " + t("tr_with", { n: who }), info: [ks.length ? t("tr_pick") : t("tr_empty")], opts: ks.map((k) => ({ label: t("tr_offer", { x: bag.label(k) }), fn: () => {
        pending = { with: id, k, role: "a" }; pendT = 40; send("to", { to: id, k }); toast(t("tr_sent", { n: who }), 2500); return "close";
      } })) };
    });
  }
  // B recebe a oferta
  room.on("to", (d, from) => {
    if (!toMe(d) || !bag.emoji(d.k)) return;
    if (pending || busy()) { send("tx", { to: from, why: "busy" }); return; }
    const who = nameOf(from), full = !bag.fits(d.k);
    pending = { with: from, get: d.k, role: "b" }; pendT = 60; Audio.play("pop");
    openMenu(() => ({ title: "🤝 " + t("tr_with", { n: who }), who, info: [t("tr_offers", { x: bag.label(d.k) }), full ? t("tr_fullGive") : t("tr_what")], opts: [
      ...bag.list().map((k) => ({ label: t("tr_give", { x: bag.label(k) }), fn: () => { pending.give = k; pendT = 40; send("tc", { to: from, k: d.k, g: k }); toast(t("tr_wait", { n: who }), 2500); return "close"; } })),
      { label: "🎁 " + t("tr_gift"), cls: ".blue", dis: full, fn: () => { pending.give = null; pendT = 40; send("tc", { to: from, k: d.k, g: null }); toast(t("tr_wait", { n: who }), 2500); return "close"; } },
      { label: "✋ " + t("tr_refuse"), cls: ".warn", fn: () => { cancel(from, "no"); return "close"; } },
    ], noClose: true }));
  });
  // A recebe a contraproposta e fecha (ou não) a troca
  room.on("tc", (d, from) => {
    if (!toMe(d) || !pending || pending.role !== "a" || pending.with !== from || pending.k !== d.k) return;
    const who = nameOf(from), g = d.g && bag.emoji(d.g) ? d.g : null; pendT = 60; Audio.play("pop");
    openMenu(() => ({ title: "🤝 " + t("tr_with", { n: who }), who, info: [g ? t("tr_counter", { y: bag.label(g), x: bag.label(d.k) }) : t("tr_counterGift", { x: bag.label(d.k) })], opts: [
      { label: "✅ " + t("tr_accept"), fn: () => {
        if (!bag.has(d.k)) { cancel(from, "no"); return "close"; }
        const n = bag.take(d.k);
        if (g && !bag.fits(g)) { bag.give(d.k, n); toast(t("full"), 3000); cancel(from, "full"); return "close"; }
        if (g) bag.give(g, 1);
        send("ta", { to: from, k: d.k, n, g }); clearPending(); done(who); return "close";
      } },
      { label: "✋ " + t("tr_refuse"), cls: ".warn", fn: () => { cancel(from, "no"); return "close"; } },
    ], noClose: true }));
  });
  // B conclui
  room.on("ta", (d, from) => {
    if (!toMe(d) || !pending || pending.role !== "b" || pending.with !== from) return;
    if (pending.give && bag.has(pending.give)) bag.take(pending.give);
    bag.give(pending.get, +d.n || 1); clearPending(); done(nameOf(from));
  });
  room.on("tx", (d, from) => {
    if (!toMe(d) || !pending || pending.with !== from) return;
    clearPending(); toast(t(d.why === "busy" ? "tr_busy" : "tr_cancel", { n: nameOf(from) }), 2800); Audio.play("wrong");
  });
  function done(who) { Audio.play("win"); toast("🤝 " + t("tr_done", { n: who }), 2800); }

  return {
    drop, ground,
    loadGround(list) { for (const id of [...ground.keys()]) takeGround(id, false); (list || []).forEach((it) => putGround(it, false)); },
    /** O que dá para fazer aqui agora (item no chão tem prioridade; depois, jogador por perto). */
    near(allowPlayer = true) {
      const it = nearGround();
      if (it) return { text: t("gr_pick", { x: bag.label(it.k) }), act: () => pickGround(it) };
      const id = allowPlayer && !pending ? nearPlayer() : null;
      if (id) return { text: "🤝 " + t("tr_with", { n: nameOf(id) }), act: () => openTrade(id) };
      return null;
    },
    update(dt) {
      if (pending) { pendT -= dt; if (pendT <= 0) { clearPending(); toast(t("tr_timeout"), 2500); } }
      for (const it of ground.values()) it.sp.position.y = 1 + Math.sin(performance.now() / 350 + it.x) * 0.08;
      // mochila nas costas de quem tem itens
      const n = bag.slots();
      if (n !== lastBg) { lastBg = n; room.presence({ bg: n }); }
      setPack(me.ch, n > 0);
      for (const r of remotes.map.values()) setPack(r.ch, !!(r.pres && r.pres.bg > 0));
    },
  };
}
function setPack(ch, on) {
  const body = ch && ch.av && ch.av.body; if (!body) return;
  const p = body.getObjectByName("pack");
  if (on && !p) wearPack(ch); else if (!on && p) body.remove(p);
}
