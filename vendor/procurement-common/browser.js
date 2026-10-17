(function (global) {
  'use strict';

  var FLOW = [
    'Draft', 'Submitted', 'Pending approval', 'Approved', 'RFQ in progress',
    'Comparing', 'Awarded', 'Ordered', 'Partially received', 'Received',
    'Matched', 'Closed'
  ];

  var STATUS_META = {
    'Draft': { tone: 'slate', icon: 'fa-pen-ruler' },
    'Submitted': { tone: 'sky', icon: 'fa-paper-plane' },
    'Pending approval': { tone: 'amber', icon: 'fa-clock' },
    'Approved': { tone: 'emerald', icon: 'fa-circle-check' },
    'RFQ in progress': { tone: 'violet', icon: 'fa-file-signature' },
    'Sent': { tone: 'sky', icon: 'fa-paper-plane' },
    'Published': { tone: 'sky', icon: 'fa-tower-broadcast' },
    'Comparing': { tone: 'violet', icon: 'fa-scale-balanced' },
    'Running': { tone: 'emerald', icon: 'fa-gavel' },
    'Paused': { tone: 'amber', icon: 'fa-pause' },
    'Awarded': { tone: 'emerald', icon: 'fa-trophy' },
    'Ordered': { tone: 'sky', icon: 'fa-cart-shopping' },
    'Awaiting receipt': { tone: 'amber', icon: 'fa-truck-ramp-box' },
    'Partially received': { tone: 'amber', icon: 'fa-box-open' },
    'Received': { tone: 'emerald', icon: 'fa-box' },
    'Matched': { tone: 'emerald', icon: 'fa-link' },
    'Closed': { tone: 'slate', icon: 'fa-lock' },
    'Exception': { tone: 'rose', icon: 'fa-triangle-exclamation' },
    'Rejected': { tone: 'rose', icon: 'fa-circle-xmark' },
    'Escalated': { tone: 'rose', icon: 'fa-arrow-trend-up' }
  };

  var ROLE_CAPABILITIES = {
    Client: ['request', 'approve', 'design', 'invite', 'publish', 'compare', 'award', 'order', 'receive', 'match', 'report'],
    Freelancer: ['view-event', 'respond', 'bid', 'message', 'view-award'],
    Admin: ['request', 'approve', 'design', 'invite', 'publish', 'compare', 'award', 'order', 'receive', 'match', 'report', 'configure', 'audit', 'moderate']
  };

  function number(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (fallback == null ? 0 : fallback);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, number(value)));
  }

  function uid(prefix) {
    var random = '';
    if (global.crypto && typeof global.crypto.getRandomValues === 'function') {
      var values = new Uint32Array(2);
      global.crypto.getRandomValues(values);
      random = Array.prototype.map.call(values, function (value) { return value.toString(36); }).join('');
    } else random = Math.random().toString(36).slice(2, 12);
    return String(prefix || 'item') + '-' + Date.now().toString(36) + '-' + random.slice(0, 10);
  }

  function statusMeta(status) {
    return STATUS_META[status] || { tone: 'slate', icon: 'fa-circle' };
  }

  function flowIndex(status) {
    var index = FLOW.indexOf(status);
    if (index >= 0) return index;
    if (status === 'Sent' || status === 'Published') return FLOW.indexOf('RFQ in progress');
    if (status === 'Awaiting receipt') return FLOW.indexOf('Ordered');
    if (status === 'Running' || status === 'Paused') return FLOW.indexOf('Comparing');
    return 0;
  }

  function can(role, capability) {
    return (ROLE_CAPABILITIES[role] || []).indexOf(capability) >= 0;
  }

  function audit(target, actor, action, detail, level) {
    var event = {
      id: uid('audit'),
      at: new Date().toISOString(),
      actor: actor || 'System',
      action: action || 'Updated',
      detail: detail || '',
      level: level || 'info'
    };
    if (target) {
      if (!Array.isArray(target.audit)) target.audit = [];
      target.audit.unshift(event);
    }
    return event;
  }

  function transition(target, nextStatus, actor, detail) {
    if (!target) return null;
    var previous = target.status || 'Draft';
    target.status = nextStatus;
    return audit(target, actor, previous + ' → ' + nextStatus, detail || '', nextStatus === 'Exception' || nextStatus === 'Rejected' ? 'danger' : 'success');
  }

  function cloneRecord(record, prefix, actor) {
    var copy = JSON.parse(JSON.stringify(record || {}));
    copy.id = uid(prefix || 'clone').toUpperCase();
    copy.sourceId = record && record.id;
    copy.status = 'Draft';
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.createdAt;
    copy.audit = [];
    audit(copy, actor || 'System', 'Cloned', 'Created from ' + ((record && record.id) || 'source'));
    delete copy.award;
    delete copy.awardedSupplierId;
    return copy;
  }

  function normalizeWeights(weights) {
    var source = weights || {};
    var result = {
      price: Math.max(0, number(source.price, 45)),
      quality: Math.max(0, number(source.quality, 25)),
      delivery: Math.max(0, number(source.delivery, 15)),
      risk: Math.max(0, number(source.risk, 10)),
      esg: Math.max(0, number(source.esg, 5))
    };
    var total = Object.keys(result).reduce(function (sum, key) { return sum + result[key]; }, 0) || 1;
    Object.keys(result).forEach(function (key) { result[key] = result[key] / total; });
    return result;
  }

  function rankQuotes(quotes, weights) {
    var rows = Array.isArray(quotes) ? quotes : [];
    if (!rows.length) return [];
    var w = normalizeWeights(weights);
    var prices = rows.map(function (row) { return number(row.price); }).filter(function (value) { return value > 0; });
    var fastest = Math.min.apply(Math, rows.map(function (row) { return Math.max(1, number(row.leadDays, 30)); }));
    var lowest = Math.min.apply(Math, prices.length ? prices : [1]);
    return rows.map(function (row) {
      var priceScore = lowest / Math.max(lowest, number(row.price, lowest)) * 100;
      var deliveryScore = fastest / Math.max(fastest, number(row.leadDays, fastest)) * 100;
      var score = priceScore * w.price + clamp(row.quality, 0, 100) * w.quality + deliveryScore * w.delivery + (100 - clamp(row.risk, 0, 100)) * w.risk + clamp(row.esg, 0, 100) * w.esg;
      return Object.assign({}, row, { score: Math.round(score * 10) / 10, priceScore: Math.round(priceScore), deliveryScore: Math.round(deliveryScore) });
    }).sort(function (a, b) { return b.score - a.score; }).map(function (row, index) { return Object.assign(row, { rank: index + 1 }); });
  }

  function validateReverseBid(auction, bidderId, amount) {
    if (!auction) return { ok: false, reason: 'Auction not found.' };
    if (String(auction.status).toLowerCase() !== 'running') return { ok: false, reason: 'Auction is not running.' };
    var participant = (auction.participants || []).find(function (item) { return item.supplierId === bidderId; });
    if (!participant) return { ok: false, reason: 'Supplier is not invited.' };
    if (participant.disqualified) return { ok: false, reason: 'Supplier is disqualified.' };
    var bid = number(amount, NaN);
    if (!Number.isFinite(bid) || bid <= 0) return { ok: false, reason: 'Enter a valid positive amount.' };
    var maximum = number(auction.currentBid) - Math.max(1, number(auction.minStep, 1));
    if (bid > maximum) return { ok: false, reason: 'Bid must be ' + maximum + ' or lower.', maximum: maximum };
    if (bid < number(auction.floor, 0)) return { ok: false, reason: 'Bid is below the configured floor.' };
    return { ok: true, participant: participant, amount: bid };
  }

  function placeReverseBid(auction, bidderId, amount, actor) {
    var validation = validateReverseBid(auction, bidderId, amount);
    if (!validation.ok) return validation;
    var previous = number(auction.currentBid);
    auction.currentBid = validation.amount;
    auction.leadingSupplierId = bidderId;
    if (!Array.isArray(auction.bids)) auction.bids = [];
    var bid = {
      id: uid('bid'), supplierId: bidderId, amount: validation.amount,
      at: new Date().toISOString(), delta: validation.amount - previous,
      source: actor || 'Bidder console'
    };
    auction.bids.push(bid);
    validation.participant.bidCount = number(validation.participant.bidCount) + 1;
    validation.participant.lastBid = validation.amount;
    audit(auction, actor || validation.participant.name, 'Bid accepted', String(validation.amount), 'success');
    return { ok: true, bid: bid };
  }

  function csv(rows, columns) {
    var list = Array.isArray(rows) ? rows : [];
    var keys = columns && columns.length ? columns : Object.keys(list[0] || {});
    var cell = function (value) {
      var text = String(value == null ? '' : value);
      var candidate = text.replace(/^[\u0000-\u0020]+/, '');
      if (typeof value === 'string' && /^[=+\-@]/.test(candidate)) text = '\t' + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    return [keys.map(cell).join(',')].concat(list.map(function (row) { return keys.map(function (key) { return cell(row[key]); }).join(','); })).join('\n');
  }

  function download(filename, content, type) {
    var safeName = String(filename || 'download').replace(/^.*[\\/]/, '').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120) || 'download';
    var body = typeof content === 'string' ? content : JSON.stringify(content == null ? '' : content);
    if (body.length > 20 * 1024 * 1024) throw new Error('Download exceeds the 20 MB safety limit.');
    var allowedTypes = ['application/json', 'text/csv', 'text/plain', 'application/octet-stream'];
    var mime = allowedTypes.indexOf(type) >= 0 ? type : 'application/octet-stream';
    var blob = new Blob([body], { type: mime + (mime.indexOf('text/') === 0 ? ';charset=utf-8' : '') });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = safeName;
    link.rel = 'noopener';
    link.hidden = true;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 0);
  }

  global.ProcurementCommon = Object.freeze({
    FLOW: FLOW.slice(),
    STATUS_META: STATUS_META,
    ROLE_CAPABILITIES: ROLE_CAPABILITIES,
    number: number,
    clamp: clamp,
    uid: uid,
    statusMeta: statusMeta,
    flowIndex: flowIndex,
    can: can,
    audit: audit,
    transition: transition,
    cloneRecord: cloneRecord,
    normalizeWeights: normalizeWeights,
    rankQuotes: rankQuotes,
    validateReverseBid: validateReverseBid,
    placeReverseBid: placeReverseBid,
    csv: csv,
    download: download
  });
})(window);
