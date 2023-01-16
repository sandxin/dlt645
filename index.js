(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.DLT645 = factory());
})(this, (function () { 'use strict';

  const ctrl_map = {
    d7: {
      0: '命令帧',
      1: '应答帧',
    },
    dd: {
      '01000': '广播校时',
      10001: '读数据',
      10010: '读后续数据',
      10011: '读通信地址',
      10100: '写数据',
      10101: '写通信地址',
      10110: '冻结命令',
      10111: '更改通信速率',
      11000: '修改密码',
      11001: '最大需量清零',
      11010: '电表清零',
      11011: '事件清零',
    },
  };
  const data_type_map = {
    '00000000': '(当前)组合有功总电能',
    '00010000': '(当前)正向有功总电能',
    '00020000': '(当前)反向有功总电能',
    '00030000': '(当前)组合无功1总电能',
    '00040000': '(当前)组合无功2总电能',
    '00050000': '(当前)第一象限无功总电能',
    '00060000': '(当前)第二象限无功总电能',
    '00070000': '(当前)第三象限无功总电能',
    '00080000': '(当前)第四象限无功总电能',
    '02010100': 'A相电压',
    '02010200': 'B相电压',
    '02010300': 'C相电压',
    '0201ff00': '电压数据块',
    '02020100': 'A相电流',
    '02020200': 'B相电流',
    '02020300': 'C相电流',
    '0202ff00': '电流数据块',
    '02030000': '瞬时有功功率',
    '02030100': '瞬时A相有功功率',
    '02030200': '瞬时B相有功功率',
    '02030300': '瞬时C相有功功率',
    '02040000': '瞬时无功功率',
    '02040100': '瞬时A相总无功功率',
    '02040200': '瞬时B相总无功功率',
    '02040300': '瞬时C相总无功功率',
    '02050000': '瞬时视在功率',
    '02050100': 'A相视在功率',
    '02050200': 'B相视在功率',
    '02050300': 'C相视在功率',
    '02060000': '总功率因数',
    '02060100': 'A相功率因数',
    '02060200': 'B相功率因数',
    '02060300': 'C相功率因数',
  };
  function DLT645(str) {
    const payload = {};
    let _str = str.toString().replace(/\s/g, '');
    let start = _str.indexOf('68');
    if (start < 0) return { errMsg: '起止符不匹配(68)' };
    let source = _str.slice(start);
    //源数据拆分
    let [, _id, _ctrl, _len, _rest] = source.match(
      /68(\w*?)68(\w{2})(\w{2})(\w*)/
    );
    const rest_arr = parseArray(_rest);
    //数据格式化
    const id_arr = parseArray(_id).reverse();
    const ctrl_bcd = parseInt(_ctrl, 16).toString(2);
    const len = parseInt('0x'+_len);
    const _data = rest_arr.splice(0, len);
    const [valid_code, exit_code] = rest_arr;
    if (exit_code !== '16') return { errMsg: '结束符不匹配(16)' };
    const valid_query = sum_hex([
      '68',
      ...parseArray(_id),
      '68',
      _ctrl,
      _len,
      ..._data,
    ])
      .toString(16)
      .slice(-2);
    let arr = [...id_arr];
    const no = arr.splice(0, 2).join('') + '-' + arr.join('');
    const [d7, d6, d5, ...dd] = ctrl_bcd.split('');

    const d7_desc = ctrl_map.d7[d7];
    const dd_desc = ctrl_map.dd[dd.join('')];
    let _data_type = _data.splice(0, 4);
    const data_type = transData(_data_type);
    const data = parseInt(transData(_data).join(''));
    // data.splice(-1, 0, '.');
    payload.data = [
      '68',
      ...parseArray(_id),
      '68',
      _ctrl,
      _len,
      ..._data,
      valid_code,
      exit_code,
    ];
    payload.id = id_arr;
    payload.no = no;
    payload.valid = valid_query === valid_code.toLowerCase();
    payload.fulfill = d5 === '0';
    payload.req_success = d6 === '0';
    payload.len = len;
    payload.ctrl_bcd = ctrl_bcd;
    payload.type = dd_desc + d7_desc;
    if(data_type_map[data_type.join('')]){
      let percent=0,unit='';
      if(data_type[0]==='00'){
        percent=100;unit='kWh';
        data_type[1]>'02'&&(unit='kvarh');
      }else if(data_type[0]==='02'){
        data_type[1]==='01'&&(percent=10,unit='V');
        data_type[1]==='02'&&(percent=1000,unit='A');
        data_type[1]==='03'&&(percent=10000,unit='kW');
        data_type[1]==='04'&&(percent=10000,unit='kvar');
        data_type[1]==='05'&&(percent=10000,unit='kVA');
        data_type[1]==='06'&&(percent=1000);
      }
      payload.res_desc = data_type_map[data_type.join('')]+`(${unit})`;
      payload.res_val =data/percent;
    }else {
      return { errMsg: '解析错误' };
    }
    return payload;
  }
  function parseArray(str) {
    str = str.replace(/(?<!$)(?<=^(\w{2})+)/g, ',');
    return str.split(',');
  }
  function sum_hex(arr) {
    return arr.reduce((pre, cur) => {
      return pre + parseInt(`0x${cur}`);
    }, 0);
  }
  function transData(arr) {
    return arr.reverse().map((v) => {
      const _v='0x' + v - 0x33;
      if(_v<0){
        return `${(_v & 0xFF).toString(16)}`
      }
      return _v.toString(16).padStart(2, '0');
    });
  }
  DLT645.parseArray = parseArray;
  DLT645.sum_hex = sum_hex;

  return DLT645;

}));
