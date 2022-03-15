/* --------------------------------------------------------------------------------------------------
 * Licensed under the "GPL-3.0" License. See License.txt in the project root for license information.
 * -------------------------------------------------------------------------------------------------- */


/** 
 * [코드 주의사항]
 * 
 * 해당 코드 내에서 플레이어(Player)의 의미는 사용자를 지칭하는 게 아닌,
 * 사용자의 정보를 바탕으로 생성된 게임에서 사용되는 "객체"를 의미한다.
 * 
 * 이는 플레이어를 대상으로 하는 모든 계산은 사용자의 이름이 아닌 (Game.find)에서 반환하는, 
 * DB.GameData['players']에 포함 돼 있는 객체를 통해 작동함을 의미한다.
 * 
 * 즉, 플레이어 객체를 얻고 싶다면 (Game.find)를 통해 얻으면 된다.
 */

importPackage(org.jsoup);

importPackage(java.lang);
importPackage(java.net);
importPackage(java.io);

const BOT_SCRIPT_NAME = "WordChain.js"; // 해당 봇(스크립트)의 파일 이름 (예시: "끝말잇기.js")
const GAME_WORD_COMMAND = "::"; // 끝말잇기 단어 입력 시 사용할 명령어 (예시: "::사과", "::과자" 등)
const BOT_COMMAND_WORD = "/끝말잇기"; // 끝말잇기 명령어 입력 시 사용할 글자 (예시: "/끝말잇기", "@끝말" 등)
const GAME_ROOM_FILTER = []; // 끝말잇기 기능을 사용하지 않을 방 목록 (예시: ["방1", "방2"])
const GAME_WORD_FILTER = []; // 끝말잇기 금지어를 설정하는 기능 (에시: ["바보", "멍청이"])
const GAME_TIMER_OUT = 30; // 끝말잇기 턴 넘기기 타이머 시간(초) (즉, 설정한 시간 이상 응답이 없으면 아웃)
const BOT_DELAY_TIME = 2; // AI가 너무 빠르게 답장하는 것을 방지하기 위한 딜레이

/** 
 * 해당 글자의 두음을 반환하는 함수
 * 
 * @returns {string} 두음을 적용한 단어
 * @author beuwi
 * @version 1.4.0
 */
String.prototype.getDoum = function() {
	let data = this.charCodeAt() - 0xAC00;

	if (data < 0 || data > 11171) {
		return null;
	}

	const RIEUL_TO_NIEUN = [4449, 4450, 4457, 4460, 4462, 4467];
	const RIEUL_TO_IEUNG = [4451, 4455, 4456, 4461, 4466, 4469];
	const NIEUN_TO_IEUNG = [4455, 4461, 4466, 4469];

	let	initial = Math.floor(data / 28 / 21) + 0x1100,
		middle = Math.floor(data / 28) % 21 + 0x1161, 
		ending = (data % 28) + 0x11A7,
		check = false, 
		result = "";
	
	if (initial == 4357) {
		check = true;
		
		if (RIEUL_TO_NIEUN.indexOf(middle) != -1) {
			initial = 4354;
		}
		else if (RIEUL_TO_IEUNG.indexOf(middle) != -1) {
			initial = 4363;
		}
		else {
			check = false;
		}
	}
	else if (initial == 4354) {
		if (NIEUN_TO_IEUNG.indexOf(middle) != -1) {
			initial = 4363;
			check = true;
		}
	}
	
	if (check) {
		initial -= 0x1100; 
		middle -= 0x1161; 
		ending -= 0x11A7;
		
		result = String.fromCharCode(((initial * 21) + middle) * 28 + ending + 0xAC00);
	}

	return result;
};

/** 
 * 해당 글자의 첫번째 글자를 반환하는 함수
 * 
 * @returns {string} 해당 단어의 첫번째 글자
 * @author beuwi
 * @version 1.4.0
 */
String.prototype.getFirst = function() {
	return this[0] /* .getDoum() */;
}

/** 
 * 해당 글자의 마지막 글자를 반환하는 함수
 * 
 * @returns {string} 해당 단어의 마지막 글자
 * @author beuwi
 * @version 1.4.0
 */
String.prototype.getLast = function() {
	return this[this.length - 1] /* .getDoum() */;
}

const Bot = {
	/** 
	 * 메시지를 전송할 때 호출되는 함수
	 * (response)에서 해당 함수 재선언
	 * 
	 * @author beuwi
	 * @version 1.4.0
	 */
	// reply : function(replier, message) { },
	reply : function(message) { },

	/** 
	 * 에러 내용을 전송할 때 호출되는 함수
	 * (response)에서 해당 함수 재선언
	 * 
	 * @author beuwi
	 * @version 1.4.0
	 */
	error : function(error) { }
 };

const Web = {
	 /** 
	 * 서버에서 값을 가져오는 함수
	 * 
	 * @param {object} value 가져올 값의 정보
	 * @returns {string} 가져온 값의 정보
 	 * @author beuwi
	 * @version 1.4.0
	 */
	getData : function(value) {
		let connect = new URL("https://raw.githubusercontent.com/ttyy3388/wordchain/master/resources" + value).openConnection();

		connect.setConnectTimeout(5000);
		connect.setUseCaches(false);

		let reader = new BufferedReader(new InputStreamReader(connect.getInputStream())),
			text = reader.readLine(), line = "";

		while ((line = reader.readLine()) > 0) {
			text += "\n" + line;
		}

		reader.close();
		connect.disconnect();
			
		return text.toString();
	},

	/** 
	 * 서버에 데이터를 전송하는 함수
	 * 
 	 * @author beuwi
	 * @version 1.4.0
	 */
	/* postData : function(type, value) {
		Jsoup.connect("https://ttyy3388.develope.dev/postData.php").data("type", type, "value", value).method(Connection.Method.POST).execute().parse();
	}, */
 }

const DB = 
{
	CustomWord : [
	{
		'name': "단어1",
		'mean': ["뜻1", "뜻2"]
	}, 
	{
		'name': "단어2",
		'mean': ["뜻1", "뜻2"]
	}],
	
	GameData : {
		'turn': 0,
		'room': null,
		'power': false, // 게임 전원 여부
		'manager': {}, // 방장 플레이어 정보
		'created': false,
		'players': {/* { // 플레이어 데이터 저장
			names: function() {
				return data['players'].map(player => player['name']);
			}
		} */ },
		'timer': { // 타이머 관련 설정
			'power': true, // 타이머 동작 여부
			'count': 0, // 타이머 카운트 값
			'thread': null, // 타이머 동작 쓰레드
		},
		'round': 0,
		'mode': { // 모드 관련 설정
			'onecom': false, // 한방단어 사용 여부
		},
		'ai': {
			'power': false,
			'id': null,
			// created: false,
			'level': 0,
			'name': null,
		}
	},

	// AIData : {},
	WordList : [],
	UsedWord : [],

	/** 
	 * DB 정보를 불러올 때 호출되는 함수
	 * 
	 * @author beuwi
	 * @version 1.4.0
	 */
	load : function() {
		DB.WordList = JSON.parse(Web.getData("list.txt"));

		// 커스텀 단어 추가
		DB.CustomWord.map(word => {
			let name = word['name'], 
				mean = word['mean'];
			// 데이터 유효성 검사
			if (!(name || mean)) {
				return false;
			}
			let fchar = name.getFirst();
			DB.WordList[name] = [mean];
			(DB.StartWord[fchar] != null) ?
			DB.StartWord[fchar].push(name) :
			DB.StartWord[fchar] = [name];
		})

		// DB.GameData = JSON.parse(DB.get("GameData"));

		return true;
	},
};

const AI = {
	/** 
	 * AI가 대답을 할 때 호출되는 함수
	 * 
	 * @param {string} word AI가 대답할 단어
	 * @returns {string} AI가 대답할 문장
 	 * @author beuwi
	 * @version 1.4.0
	 */
	getReply : function(word) {
		// 입력 딜레이 지연
		Thread.sleep(BOT_DELAY_TIME * 1000);
		return AI.getWord(word);
	},

	/** 
	 * AI가 대답할 단어를 계산하는 함수
	 * 
	 * 변수 네이밍의 경우 너무 길어지기 때문에 최소화(Reply(r), Start(s), Word(w), Doum(d))
	 * 또한 계산 속도를 생각하여 [Optimized for loop]를 사용
	 * 
	 * @param {string} word AI가 대답할 단어
	 * @returns {string} AI가 대답한 문장
 	 * @author beuwi
	 * @version 1.4.0
	 */
	// 
	getWord : function(word) {
		let data = DB.GameData,
			list = DB.StartWord;

		// (*) 설명을 위해 유저가 입력한 단어가 "사랑"이라고 가정
		let swords = list[word.getLast()], // "사랑"의 마지막 글자인 "랑"으로 시작하는 단어 목록
			dswords = list[word.getLast().getDoum()]; // "랑"에 두음을 적용한 "낭"로 시작하는 단어 목록

		// "랑"으로 시작하는 단어가 있다면
		if (swords) {
			// "낭"으로도 시작하는 단어가 있다면
			if (dswords) {
				// 두 단어 목록을 하나로 합침
				swords = swords.concat(dswords);
			}
		}
		else {
			// "낭"으로 시작하는 단어만 있다면
			if (dswords) {
				swords = dswords;
			}
			// 시작하는 단어가 없으면 실패 출력(AI 패배)
			else return null;
		}
		

		// (*) AI는 유저가 대답할 단어의 경우의 수마저 계산
		// (*) "사랑"에 대답할 단어가 ["낭로", "낭랑"] 두 가지가 있다고 가정
		let rwords = [], // AI가 대답할 단어 목록(중복 단어 제외)
			rswords = [], // 각 단어의 마지막 글자인 ["로", "랑"]으로 시작하는 단어 목록
			drwords = [], // ["로", "랑"]에 두음을 적용한 ["노", "낭"]으로 시작하는 단어 목록
			
			rwpoints = []; // 대답할 단어의 경우의 수 계산(하단 설명)
			
		let length = swords.length,
			index = 0, count = 0;

		// "랑" 또는 "낭"으로 시작하는 단어 계산
		for (index = 0 ; index < length ; index ++) {
			let sword = swords[index];
			// 이미 사용한 단어는 제외
			if (!DB.UsedWord.includes(sword)) {
				// AI가 대답할 단어 목록에 추가
				rwords[count ++] = sword;
			}
		}

		let maxval = 0;

		let onecomwords = [], onecomlen = 0;

		// AI가 대답할 단어 계산
		for (index = 0 ; index < count ; index ++) {
			// 윗쪽에서 했던 계산과 동일한 원리(설명 생략)
			let rword = rwords[index];
			rswords = list[rword.getLast()];
			drswords = list[rword.getLast().getDoum()];
			if (rswords) {
				if (drswords) {
					rswords = rswords.concat(drswords);
				}
			}
			else {
				if (drswords) {
					rswords = drswords;
				}
				// 한방단어 모드 적용 부분(유저가 대답할 단어가 없다는 의미)
				else { 
					let mode = data['mode']
					// 한방 단어가 꺼져있으면
					if (!mode['onecom']) {
						continue; // 해당 단어를 무효 처리
					}
					// oncomwords[onecomlen ++] = rword;
					rswords = []; // 해당 배열은 (undefined)상태이므로 빈 배열로 변환
				}
			}

			// 대답할 단어의 경우의 수 계산 및 저장
			let value = rswords.length;
			rwpoints[index] = value;

			// 경우의 수가 가장 많은 값 저장
			if (maxval < value) {  
				maxval = value;
			}
		}

		let easyval = maxval * 0.5, // 이지모드: 대답할 경우의 수가 가장 많음
			// 노말모드 : 이지모드와 하드모드의 중간 값으로 값 지정 X
			hardval = maxval * 0.2, // 하드모드: 대답할 경우의 수가 가장 적음

			// 푸시 메소드보다 인덱스 배열 접근이 빠름
			easycount = 0,
			nomalcount = 0,
			hardcount = 0,

			easywords = [],
			nomalwords = [],
			hardwords = [];

		// 저장한 경우의 수를 바탕으로 계산
		for (index = 0 ; index < count ; index ++) {
			let rwpoint = rwpoints[index], // 해당 단어로 대답할 경우의 수
				rword = rwords[index]; // 해당 단어로 대답할 단어

			// (*) AI가 대답할 경우의 수가 100개라고 가정
		
			if (easyval <= rwpoint) { // 경우의 수가 50개 이상: 이지모드
				easywords[easycount ++] = rword;
			}
			else if (hardval <= rwpoint && rwpoint < easyval) { // 경우의 수가 20개 이상 50개 미만
				nomalwords[nomalcount ++] = rword;
			}
			else /* if (hardval < rwpoint) */ { // 경우의 수가 20개 미만
				hardwords[hardcount ++] = rword;
			}
		}

		let getWord = function(array) {
			let length = array.length, 
				data = [], count = 0, temp = "", index = 0;

			// 서버가 복구된다면 단어 데이터 관련 계산 삽입
			{ }

			// 현재 서버 불량으로 랜덤 단어만 출력
			return array[Math.floor(Math.random() * length)];
		}

		let result = null;

		switch(DB.GameData['ai']['level']) {
			case 3 : result =
				// 하드모드 단어가 있다면 대답
				(hardcount) ? getWord(hardwords) :
				// 하드모드 단어가 없으면 노멀모드 단어 대답
				(nomalcount) ? getWord(nomalwords) :
				// 노멀모드 단어도 없으면 이지모드 단어 대답
				(easycount) ? getWord(easywords) : null;
				// 이지모드 단어도 없으면 AI 패배로 (null) 대답
				break;

			case 2 : result =
				// 노멀모드 단어가 있다면 대답
				(nomalcount) ? getWord(nomalwords) :
				// 노멀모드 단어가 없으면 이지모드 단어 대답
				(easycount) ? getWord(easywords) : null;
				// 이지모드 단어도 없으면 AI 패배로 (null) 대답
				break;
				
			case 1 : result =
				// 이지모드 단어가 있다면 대답
				(easycount) ? getWord(easywords) : null;
				// 이지모드 단어도 없으면 AI 패배로 (null) 대답
				break;
		}

		/* Bot.reply(
			"[ DEBUNG PRINT ]\n\n" + 
			"HARD COUNT : " + hardcount + "\n" +
			"NOMAL COUNT : " + nomalcount + "\n" +
			"EASY COUNT : " + easycount + "\n" +
			"HARD WORD : " + hardwords + "\n" +
			"NOMAL WORD : " + nomalwords + "\n" +
			"EASY WORD : " + easywords
		); */

		return result;
	}
};

const Word = {
	/** 
	 * 해당 단어가 적합한지 확인하는 함수
	 * 
	 * @param {string} word 적합한지 확인할 단어
	 * @returns {booelan} 해당 단어의 적합 여부
 	 * @author beuwi
	 * @version 1.4.0
	 */
	check : function(word) {
		// 단어를 입력하지 않은 경우
		if (!word) {
			Bot.reply("단어를 입력해 주세요.");
			return false;
		}
		// 한 글자만 입력한 경우
		if (word.length < 2) {
			Bot.reply("두 글자 이상의 단어를 입력해 주세요.");
			return false;
		}

		// 해당 단어가 존재하지 않는 경우
		if (!Word.isWord(word)) {
			Bot.reply("\"" + word + "\"(은)는 사전에 등록되지 않은 단어입니다.");
			return false;
		}
		// 이미 사용한 단어를 입력한 경우
		if (Word.isUsed(word)) {
			Bot.reply("이미 사용한 단어입니다.");
			return false;
		}
		// 금지어로 등록한 단어를 입력한 경우
		if (Word.isForbidden(word)) {
			Bot.reply("금지어로 등록된 단어입니다.");
			return false;
		}

		let data = DB.GameData,
			fchar = word.getFirst();
			lchar = data['word'].getLast();

		// 이전 플레이어가 입력한 단어로 시작하지 않은 경우
		if (lchar != fchar) {
			let doum = lchar.getDoum();
			// 두음 법칙을 적용해도 일치하지 않으면
			if (doum != fchar) {
				// 예시: 소라를 입력했다면 "라(나)"(으)로 시작하는 ... 로 표시"
				let doummsg = doum ? (lchar + "(" + doum + ")") : lchar; 		
				Bot.reply("\"" + doummsg + "\"(으)로 시작하는 단어를 입력해 주세요."); 
				return false;
			}
		}
		
		return true;
	},

	/** 
	 * 해당 단어가 사전에 등록됐는지 확인하는 함수
	 * 
	 * @param {string} word 등록됐는지 확인할 단어
	 * @returns {booelan} 해당 단어의 사전등록 여부
 	 * @author beuwi
	 * @version 1.4.0
	 */
	isWord : function(word) {
		// 먼저 단어 목록에 있는지
		if (Object.keys(DB.WordList).includes(word)) {
			return true;
		}
		// 없다면 유저가 추가한 단어장에 있는지
		if (Object.keys(DB.CustomWord).includes(word)) {
			return true;
		}
		// 해당되지 않는다면 존재하지 않는 단어로 판단
		return false;
	},

	/** 
	 * 해당 단어가 이미 사용된 단어인지 확인하는 함수
	 * 
	 * @param {string} word 중복인지 확인할 단어
	 * @returns {booelan} 해당 단어의 중복 여부
	 * @version 1.4.0
	 */
	isUsed : function(word) {
		return DB.UsedWord.includes(word);
	},

	/** 
	 * 해당 단어가 금지어인지 확인하는 함수
	 * 
	 * @param {string} word 금지어인지 확인할 단어
	 * @returns {booelan} 해당 단어의 금지어 여부
	 * @version 1.4.0
	 */
	isForbidden : function(word) {
		return GAME_WORD_FILTER.includes(word);
	},

	/** 
	 * 해당 단어가 한방단어인지 확인하는 함수
	 * 
	 * @param {string} word 뜻을 가져올 단어
	 * @returns {string} 해당 단어의 뜻
	 * @version 1.4.0
	 */
	isOneCom : function(word) {
		let lchar = word.getLast(),
			doum = lchar.getDoum();
		return !(DB.StartWord[lchar] || DB.StartWord[doum]);
	},

	/** 
	 * 해당 단어의 뜻을 가져올 때 호출되는 함수
	 * 
	 * @param {string} word 뜻을 가져올 단어
	 * @returns {string} 해당 단어의 뜻(사전에 없으면 null)
	 * @version 1.4.0
	 */
	getMean : function(word) {
		// 사전에 단어가 존재하지 않으면
		if (!Word.isWord(word)) {
			return null;
		}
		let fchar = word.getFirst(),
			path = "data/" + fchar + "/" + word + ".txt";
		return JSON.parse(Web.getData(path))
	},

	/** 
	 * 무작위 단어를 가져올 때 호출되는 함수
	 * 
	 * @param {boolean} check 조건 적용 여부
	 * @returns {string} 산출한 무작위 단어 
	 * @version 1.4.0
	 */
	getRandom : function(check) {
		let mode = DB.GameData['mode'];
		
		let list = Object.keys(DB.WordList),
			word = null, count = 0;

		while (true) {
			// 100번 시도해도 안되면 문제가 발생했다고 인식
			if ((count ++) > 99) {
				Bot.reply("무작위 단어 계산 중 문제가 발생했습니다.");
				return null;
			}

			word = list[Math.floor(Math.random() * list.length)];

			//  옵션이 켜져 있다면
			if (check) {
				// 사용된 적이 있는 단어라면
				if (Word.isUsed(word)) {
					continue;
				}
				// 한방 단어라면
				if (Word.isOneCom(word)) {
					// 모드도 꺼져있다면
					if (!mode['onecom']) {
						continue; // 해당 단어 스킵
					}
					// 모드가 켜져있으면 상관 X
				}
				// 조건을 충족한다면 반환
				return word;
			}
			// 옵션이 꺼져 있으면
			else {
				// 바로 반환
				return word;
			}
		}
	}
}

const Timer = {
	/** 
	 * 타이머를 동작할 때 호출되는 함수
	 * 
 	 * @author beuwi
	 * @version 1.4.0
	 */
	start : function() {
		let data = DB.GameData['timer'];
		let thread = new Thread({ 
			run : function() {
			try {
				// 타이머 전원이 들어와야 작동
				while (data['power']) {
					if (thread.isInterrupted()) {
						break;
					}

					// 1초마다 타이머 동작
					Thread.sleep(1000);
						
					// 타이머 시간 초과 시
					if (data['count'] >= GAME_TIMER_OUT) {
						// 현재 플레이어 타임아웃
						Game.timeout();
						// 타이머 시간 초기화
						data['count'] = 0;
					}
					else {
						// 타이머 시간 증가
						data['count'] += 1;

						// 10초 이상 값을 지정해야 메시지 출력
						if (GAME_TIMER_OUT > 10) {	
							// 남은 시간이 10초인지 확인
							if ((GAME_TIMER_OUT - data['count']) == 10) {
								Bot.reply("10초 남았습니다.");
							}
						}
					}	
				}
			}
			// 타이머의 경우 외부 요인 등 에러가 많이 발생
			catch(e) {
				thread.interrupt();
			}
		}});
		thread.start();

		// 타이머 쓰레드 입력
		data['thread'] = thread;
	},

	/** 
	 * 타이머를 중지할 때 호출되는 함수
	 * 
 	 * @author beuwi
	 * @version 1.4.0
	 */
	stop : function() {
		let data = DB.GameData['timer'];

		try {
			// 쓰레드를 가져왔다면 정지
			if (data['thread'] != null) {
				// 이미 쓰레드가 정지됐다면 작동 X
				if (data['thread'].isInterrupted()) {
					return;
				}
				data['thread'].interrupt()
			}
		}
		// 모종의 이유로 쓰레드를 종료하지 못했다면
		catch(e) {
			// 직접 타이머 관련 값 초기화
			data['count'] = 0;
			data['power'] = false;
		}
	}
}

const Game =
{
	/** 
	 * 게임에 관련된 값을 초기화하는 함수
	 * (Api.reload()을 대신하여 다른 앱과의 호환성 지원)
	 * 
 	 * @author beuwi
	 * @version 1.4.0
	 */
	init : function() {
		// 현재 호환성을 고려치 않기에 사용 X
	},

	/** 
	 * 게임을 시작했을 때 호출되는 함수
	 * 
	 * @returns {boolean} DB의 로드 성공여부
 	 * @author beuwi
	 * @version 1.4.0
	 */
	start : function() {
		// 데이터 베이스 로드
		/* let loaded = DB.load();
		// 로드 실패 시 -1 리턴
		if (!loaded) {
			return false;
		} */
	   	
		// 게임 데이터 입력
		let data = DB.GameData;
		data['word'] = Word.getRandom(true); // 무작위 단어로 시작
		data['power'] = true;

		// 타이머 동작
		Timer.start();

		return true;
	},

	/** 
	 * 게임을 생성했을 때 호출되는 함수
	 * 
	 * @param {string} room 방 이름
	 * @param {string} player 방장 정보
 	 * @author beuwi
	 * @version 1.4.0
	 */
	create : function(room, player) {
        // 게임 데이터 입력
		let data = DB.GameData;
		data['room'] = room;
		data['manager'] = player;
		data['created'] = true;
	},

	/** 
	 * 게임을 종료했을 때 호출되는 함수
	 * 
 	 * @author beuwi
	 * @version 1.4.0
	 */
	off : function() {
		Timer.stop();
		Api.reload(BOT_SCRIPT_NAME);
	},

	/** 
	 * 게임을 재시작했을 때 호출되는 함수
	 * 
 	 * @author beuwi
	 * @version 1.4.0
	 */
	restart : function() {

	},

	/** 
	 * 게임에 참가헸을 때 호출되는 함수
	 * 
	 * @param {string} sender 참가한 사람의 이름
	 * @returns {object} 생성된 플레이어 정보
 	 * @author beuwi
	 * @version 1.4.0
	 */
    join : function(id, name) {
		let data = DB.GameData;
		
		let object = {
			'id': id,
			'name': name,
			'life': 3,
			'score': 0,
		};

		// 플레이어 정보 입력
		data['players'].push(object);

		return object;
    },
	
	/** 
	 * 플레이어 정보를 ID를 바탕으로 반환하는 함수
	 * 
	 * @param {string} id 대상 ID
 	 * @author beuwi
	 * @version 1.4.0
	 */
	 find : function(id) {
		let data = DB.GameData;
		let result = null;
		data['players'].forEach(player => {
			if (id.equals(player['id'])) {
				result = player;
			}
		});
		return result;
	},

	/** 
	 * 플레이어를 아웃시킬 때 호출되는 함수
	 * 
	 * @param {object} tplayer 대상(아웃시킬) 플레이어에 대한 정보
	 * @param {object} msgobj 출력 메시지에 대한 정보
 	 * @author beuwi
	 * @version 1.4.0
	 */
	gameout : function(tplayer, msgobj) {
		let data = DB.GameData;

		let	tindex = data['players'].indexOf(tplayer), // 대상 플레이어 차례
			xplayer = data['players'][tindex + 1]; // 다음 플레이어 정보

		// 혹시나 하는 경우를 대비해서 출력
		// ㄴ 어차피 예외사항이 발생하면 작동 불가
		/* if (!tplayer) {
			Bot.reply("잘못된 플레이어 입력입니다.");
			return;
		} */

		// 다음 플레이어가 없다면 첫번째 플레이어 지정
		if (!xplayer) { xplayer = data['players'][0]; }

		// 남은 플레이어가 3명 이상이라면
		if (data['players'].length > 2) {
			let timer = data['timer'],
				ai = data['ai'];

			// 타이머 시간 초기화
			timer['count'] = 0;	

			// 플레이어 목록에서 제거
			data['players'].splice(tindex, 1);
			
			// 아웃 메시지 출력
			Bot.reply(msgobj['gameout']);

			// 해당 플레이어 차례가 아닌데 아웃이라면
			if (data['turn'] != tindex) {
				// 해당 플레이어 차례가 지난 경우(차례 < 턴)
				if (data['turn'] < tindex) {
					// 해당 플레이어가 첫번째가 아니면
					if (data['turn'] != 0) {
						// 게임 턴을 1회 감소
						data['turn'] -= 1
					}
					// 만약 첫번째 차례라면 상관 X
				}	
			}
			// 해당 플레이어 차례에서 아웃이라면
			else {
				// 해당 플레이어가 마지막 차례라면
				if (data['players'].length <= tindex) {
					// 첫번째부터 다시 시작
					data['turn'] = 0;
				}

				// 이후 무작위 단어로 진행
				let word = Word.getRandom(true),
					lchar = word.getLast(), 
					doum = lchar.getDoum(),
					doummsg = (doum) ? lchar + "(" + doum + ")" : lchar;

					// 다음 플레이어는 새로운 단어로 시작
					Bot.reply("[ " + xplayer['name'] + " ] 님은 \"" + doummsg + "\"(으)로 시작하는 단어를 입력해 주세요.");
					
				// 새로운 단어 저장
				data['word'] = word;
			}
			
			// AI 모드가 활성화돼 있다면
			if (ai['power']) {
				// 다음 플레이어가 AI 차례라면
				if (xplayer['id'].equals(ai['id'])) {
					// AI가 대답한 단어 저장
					let reply = AI.getReply(data['word']);
					// AI가 대답할 단어가 없으면
					if (!reply) {
						// AI가 항복한 것처럼 처리
						Game.giveup(Game.find(ai['id']));
						return;
					}
					// AI가 대답한 단어 출력
					Bot.reply("[ " + ai['name'] + " ] : " + reply);
					// 이후 이벤트 발생
					Game.main(data['room'], GAME_WORD_COMMAND + reply, ai['name']);
				}
			}
		}
		// 남은 플레이어가 2명(1대1 상황)이라면
		else {	
			Bot.reply(msgobj['gameoff']);
			Game.off();
		}
	},
	
	/** 
	 * 플레이어를 강퇴할 때 호출되는 함수
	 * 
	 * @param {object} tplayer 대상 플레이어의 정보
 	 * @author beuwi
	 * @version 1.4.0
	 */
	/* kickout: function(tplayer) {
		let data = DB.GameData;
			
		let	xplayer = data['players'][data['turn'] + 1]; // 다음 플레이어 정보

		Game.out({
			'off': "< 플레이어 추방 >\n\n" +
			"[ " + player['name] + " ] 님이 추방되어 게임을 종료합니다.\n\n" +
			"승자는 [ " + xplayer['name'] + " ] 님 입니다!",
			'out': "< 기권 패배 >\n\n" +
			"[ " + player['name] + " ] 님이 추방되었습니다.\n\n" +
			"남은 플레이어 : " + data['players'].map(player => player['name']).join(", ")
		});
	}, */

	/** 
	 * 플레이어가 항복했을 때 호출되는 함수
	 * (추후 인자를 받지 않도록 수정할 예정)
	 * 
	 * @param {string} tplayer 대상 플레이어의 정보
 	 * @author beuwi
	 * @version 1.4.0
	 */
	giveup : function(tplayer) {
		let data = DB.GameData;
			
		// let	tplayer = null; // 대상 플레이어 정보

		// 이름이 일치하는 플레이어의 정보를 가져옴
		/* data['players'].forEach(player => {
			if (player['name'] != sender) {
				return;
			}
			tplayer = player;
		}); */
		
		// 대상 플레이어 값을 찾지 못했다면
		// ㄴ 예외사항이 발생하면 작동불가니까 오류 출력
		/* if (!tplayer) {
			Bot.reply("잘못된 플레이어 입력입니다.");
			return;
		} */

		let tindex = data['players'].indexOf(tplayer), // 대상 플레이어 위치
			xplayer = data['players'][tindex + 1]; // 다음 플레이어 정보

		// 다음 플레이어가 없다면 첫번째 플레이어 지정
		if (!xplayer) { xplayer = data['players'][0]; }
		
		// 플레이어 아웃 및 메시지 입력
		Game.out(tplayer, {
			'gameoff' : 
				"< 기권 패배 >\n\n" +
				"[ " + tplayer['name'] + " ] 님이 기권하여 게임을 종료합니다.\n\n" +
				"승자는 [ " + xplayer['name'] + " ] 님 입니다!",
			'gameout' :
				"< 기권 패배 >\n\n" +
				"[ " + tplayer['name'] + " ] 님이 기권하여 아웃되었습니다.\n\n" +
				"남은 플레이어 : " + 
				data['players'].filter(player => player['id'] != tplayer['id']).map(player => player['name']).join(", ")
		});
	},
	
	/** 
	 * 타이머 시간이 초과됐을 때 호출되는 함수
	 * 
 	 * @author beuwi
	 * @version 1.4.0
	 */
	timeout : function() {
		let data = DB.GameData;
			
		let	nplayer = data['players'][data['turn']], // 현재 플레이어 정보
			xplayer = data['players'][data['turn'] + 1]; // 다음 플레이어 정보

		// 다음 플레이어가 없다면 첫번째 플레이어 지정
		if (!xplayer) { xplayer = data['players'][0]; }

		// 라이프 감소 및 탈락 대상자인지 확인
		if ((nplayer['life'] -= 1) <= 0) {
			// 플레이어 아웃 및 메시지 입력
			Game.out(nplayer, {
				'gameoff' : 
					"< 시간 초과 >\n\n" + 
					"[ " + nplayer['name'] + " ] 님이 라이프가 소진되어 게임을 종료합니다.\n\n" +
					"승자는 [ " + xplayer['name'] + " ] 님 입니다!",
				'gameout' :
					"< 시간 초과 >\n\n" + 
					"[ " + nplayer['name'] + " ] 님이 라이프가 0이 되어 아웃되었습니다.\n\n" +
					"남은 플레이어 : " + 
					data['players'].filter(player => player['id'] != nplayer['id']).map(player => player['name']).join(", ")
			});
		}
		// 탈락 대상자가 아닌 목숨만 차감될 경우
		else {
			Bot.reply(
				"< 시간 초과 >\n\n" + 
				"[ " + nplayer['name'] + " ] 님의 라이프가 감소합니다.\n\n" + 
				"남은 라이프 : " + nplayer['life']
			);
		}
	},

	/** 
	 * 단어 입력에 성공했을 때 호출되는 함수
	 * 
	 * @param {string} sender 참가한 사람의 이름
 	 * @author beuwi
	 * @version 1.4.1
	 */
	event : function(player, word) {
		let data = DB.GameData,
			used = DB.UsedWord;

		let timer = data['timer'],
			ai = data['ai'];

		// 혹시나 하는 경우를 대비해서 출력
		/* if (!player) {
			Bot.reply("잘못된 플레이어 입력입니다.");
			return;
		} */

		// 다음 턴으로 넘기고 마지막 순서인지 계산
		if ((data['turn'] += 1) >= data['players'].length) {
			// 마지막 순서였다면 처음부터 다시 시작
			data['turn'] = 0;
		}

		// 플레이어 점수 반영
		player['score'] += (20 * (word.length - 1)) + Math.floor(Math.random() * (10 + (data['round'] / 10)))

		// 사용된 단어 추가
		used.push(word);

		// 게임 정보 업데이트
		data['round'] += 1; // 한 라운드 증가
		data['word'] = word; // 입력한 단어 저장
		timer['count'] = 0; // 타이머 시간 초기화

		// 다음 플레이어 계산
		let xplayer = data['players'][data['turn']];

		let mean = Word.getMean(word).join(", "),
			lchar = word.getLast(),
			doum = lchar.getDoum();
				
		let meanmsg = (mean.length > 30) ? mean.substr(0, 25) + "..." : mean;
			doummsg = (doum) ? lchar + "(" + doum + ")" : lchar; 
			
		Bot.reply("< " + meanmsg + " >\n\n" +
			"[ " + player['name'] + " ] 님이 \"" + word + "\" 단어를 입력했습니다.\n" +
			"[ " + xplayer['name'] + " ] 님은 \"" + doummsg + "\"(으)로 시작하는 단어를 입력해 주세요"
		);

		if (ai['power']) {
			// 다음 플레이어가 AI 차례라면
			if (xplayer['id'].equals(ai['id'])) {
				// AI가 대답한 단어 저장
				let reply = AI.getReply(word);
				// AI가 대답한 단어 출력
				Bot.reply("[ " + ai['name'] + " ] : " + reply);
				// 이후 이벤트 발생
				Game.main(data['room'], GAME_WORD_COMMAND + reply, ai['name']);
			}	
		}
	},

	/** 
	 * 게임에 관련된 모든 것을 총괄하는 함수
	 * 
	 * @param {string} room 전송된 방
	 * @param {string} message 전송된 메시지
	 * @param {string} sneder 전송자 이름
 	 * @author beuwi
	 * @version 1.4.1
	 */
	main : function(room, message, sender, imageDB) { 
		let isWordCmd = message.startsWith(GAME_WORD_COMMAND),
			isBotCmd = message.startsWith(BOT_COMMAND_WORD);
	
		// 명령어를 입력하는 경우만 동작
		if (!(isWordCmd || isBotCmd)) {
			return;
		}

		// 프로필을 조합해 유저 ID 계산
		let profile = imageDB.getProfileHash(),
			id = "@" + sender + ":" + profile;

		let data = DB.GameData,
			used = DB.UsedWord;

		if (isWordCmd) {
			// 진행중인 게임이 없다면
			if (!data['power']) {
				return;
			}
			// 게임을 생성한 방이 아니라면
			if (data['room'] != room) {
				return;
			}
			
			let word = message.substring(GAME_WORD_COMMAND.length).trim(), 
				list = data['players'].map(player => player['id']);

			// 게임에 참가 중인 플레이어라면
			if (list.includes(id)) {
				let index = list.indexOf(id);
				// 해당 플레이어 차례가 아니라면
				if (data['turn'] != index) {
					Bot.reply("현재 순서는 [ " + data['players'][data['turn']] + " ] 님 차례입니다.");
					return;
				}
				// 적합한 단어로 확인된다면
				if (Word.check(word)) {
					let player = Game.find(id);
					// 게임 이벤트 발생
					Game.event(player, word);
				}
			}
		}

		if (isBotCmd) {
			let	input1 = message.split(" ")[1],
				input2 = message.split(" ")[2],
				input3 = message.split(" ")[3];
		
			switch (input1) {
				case "도움말" : {
					Bot.reply(
						"< 끝말잇기 도움말 >\n\n" +
						"- 게임시작 방법 : 게임 생성 > 인원 모집 > 게임 시작\n" +
						"- 단어입력 방법 : " + GAME_WORD_COMMAND + "단어\n" + ("\u200b".repeat(500)) + "\n" +
						"-------------------------------------------------------------\n" +
						"< 끝말잇기 명령어 >\n\n" +
						"[ 게임 관련 ]\n" +
						BOT_COMMAND_WORD + " 게임 [데이터, 생성, 참가, 시작, 기권, 종료]\n\n" +
						"[ AI 관련 ]\n" +
						BOT_COMMAND_WORD + " AI 추가 [초보, 중수, 고수]\n\n" +
						"[ 모드 관련 ]\n" +
						BOT_COMMAND_WORD + " 모드 한방단어 [켜기, 끄기]\n\n" +
						"[ 사전 관련 ]\n" +
						BOT_COMMAND_WORD + " 검색(사전) 단어 \"단어\"\n" +
						BOT_COMMAND_WORD + " 검색(사전) 시작단어 \"글자\"\n\n" +
						"※ 사전 주의사항 : \"단어\"에서 큰따옴표를 포함해야 인식됩니다."
					); 
					break;
				}
				case "게임" : {
					switch(input2) {
						case "정보" :
						case "데이터" : {
							if (!data['power']) {
								Bot.reply("진행 중인 게임이 없습니다.");
								return;
							}

							Bot.reply(
								"< 진행중인 게임 >" + 
								("\u200b".repeat(500)) + 
								"\n\n[ 플레이어 정보 ]\n\n" +
								data['players'].map(player => { 
									return 	"[ " + player['name'] + " ]\n" +   
									 		"점수 : " + player['score'] + "p\n" +  
								     		"목숨 : " + player['life'];
								}).join("\n") + 
								"[ 사용한 단어 : " + used.join(" - ") + " ]"
							);
							break;
						}

						case "생성" : {
							if (data['created']) {
								Bot.reply("이미 생성된 게임이 있습니다.");
								return;
							}
		
							let player = Game.join(id, sender);
							// Game.init();
							Game.create(room, player);
							
							Bot.reply("[ " + player['name'] + " ] 님이 끝말잇기 게임을 생성했습니다.");
							break;
						}
		
						case "참가" : {
							if (!data['created']) {
								Bot.reply("현재 생성된 게임이 없습니다.");
								return;
							}
							if (data['power']) {
								Bot.reply("게임이 이미 진행 중입니다.");
								return;
							}
							let list = data['players'].map(player => player['id']);
							if (list.includes(id)) {
								Bot.reply("이미 게임에 참가 중입니다.");
								return;
							}
		
							let player = Game.join(id, sender);

							Bot.reply(
								"[ " + player['name'] + " ] 님이 게임에 참가했습니다.\n\n" +
								"현재 참가자 : " + data['players'].map(player => player['name']).join(", ")
							);
							break;
						}
		
						case "시작" : {
							if (!data['created']) {
								Bot.reply("현재 생성된 게임이 없습니다.");
								return;
							}
							let manager = data['manager'];
							if (!id.equals(manager['id'])) {
								Bot.reply("생성자(방장)만 입력이 가능합니다.");
								return;
							}
							if (data['players'].length < 2) {
								Bot.reply("여러 명이 참가해야 게임 시작이 가능합니다.");
								return;
							}
							
							if (!DB.load()) {
								Bot.reply("DB를 불러오는 중 문제가 발생했습니다.");
								return;
							}
		
							Game.start();

							let lchar = data['word'].getLast(), doum = lchar.getDoum(),
								doummsg = (doum) ? lchar + "(" + doum + ")" : lchar; 

							let list = ["첫", "두", "세", "네", "다섯", "여섯", "일곱", "여덟", "아홉", "열"], index = 0;

							Bot.reply(
								"게임을 시작합니다!\n\n" +
								"[ 플레이어 정보 ]\n" +
								data['players'].map(player => {
									return list[index ++] + "번째 : " + player['name'];
								}).join("\n") + "\n\n" +
								"[ " + sender + " ] 님은 \"" + doummsg + "\"(으)로 시작하는 단어를 입력해 주세요."
							);
							break;
						}

						case "나가기" :
						case "기권" : {
							let list = data['players'].map(player => player['id']);
							if (!list.includes(id)) {
								Bot.reply("참가 중인 게임이 없습니다.");
								return;
							}
							let index = list.indexOf(id);
							if (data['turn'] != index) {
								Bot.reply("차례가 왔을 때만 기권(나가기)이 가능합니다.");
								return;
							}

							Game.giveup(Game.find(id));
							break;
						}
		
						case "종료" : {
							if (!data['power']) {
								Bot.reply("진행 중인 게임이 없습니다.");
								return;
							}
							let manager = data['manager'];
							if (!id.equals(manager['id'])) {
								Bot.reply("생성자(방장)만 입력이 가능합니다.");
								return;
							}
							Bot.reply("끝말잇기 게임이 종료됩니다.");
							Game.off();
							break;
						}

						default : {
							Bot.reply(
								"잘못된 명령어 입력입니다.\n\n" + 
								"[(정보, 데이터), 생성, 참가, 시작, 기권, 종료] 중 입력해 주세요."
							);
							return;
						}
					}
					break;
				}

				case "모드" : {
					// 모드는 게임 중에도 변경 가능
					/* if (data['power']) {
						Bot.reply("게임이 이미 진행 중입니다.");
						return;
					} */
					if (!data['created']) {
						Bot.reply("현재 생성된 게임이 없습니다.");
						return;
					}
					let manager = data['manager'];
					if (!id.equals(manager['id'])) {
						Bot.reply("생성자(방장)만 입력이 가능합니다.");
						return;
					}
					switch(input2) {
						case "한방단어": {
							switch(input3) {
								case "켜기": {
									Bot.reply("한방단어 모드가 켜졌습니다.");
									data['mode']['onecom'] = true;
									break;
								}
								case "끄기": {
									Bot.reply("한방단어 모드가 꺼졌습니다.");
									data['mode']['onecom'] = false;
									break;
								}
								default : {
									Bot.reply(
										"잘못된 명령어 입력입니다.\n\n" + 
										"[켜기, 끄기] 중 입력해 주세요."
									);
									return;
								}
							}
							break;
						}
						default : {
							Bot.reply(
								"잘못된 명령어 입력입니다.\n\n" + 
								"[한방단어] 중 입력해 주세요."
							);
							return;
						}
					}
					break;
				}

				case "사전" :
				case "검색" : {
					if (!DB.load()) {
						Bot.reply("DB를 불러오는 중 문제가 발생했습니다.");
						return;
					}
					switch (input2) {
						case "단어" : {
							// /끝말잇기 검색 단어 "사과"
							let word = message.split("\"")[1];
							if (Word.isWord(word)) {
								let means = Word.getMean(word), text = [], index = 0;
								means.forEach(mean => {
									text[index ++] = ("「" + java.lang.String.format("%03d", Integer(index)) + "」「명사」 " + mean);
									do { text[0] += "\u200b".repeat(500); } while (false)
								})
								Bot.reply(
									"< \"" + word + "\"의 검색 결과 : " + word.length + "개 >\n\n" +
									text.join("\n\n")
								);
							}
							else {
								Bot.reply("사전에 등록되지 않은 단어입니다.");
								return;
							}
							break;
						}
						case "시작단어" : {
							let start = message.split("\"")[1];
								list = DB.StartWord;
	
							if (!list[start]) {
								Bot.reply("\"" + start + "\"(으)로 시작하는 단어는 사전에 없습니다.");
								return;
							}

							Bot.reply(
								"< " + start + "(으)로 시작하는 단어 " + list[start].length + "개 >" +
								"\u200b".repeat(500) + "\n\n" + list[start].join(", ")
							);
							break;
						}
						/* case "한방단어" : {
							break;
						} */
						default : {
							Bot.reply(
								"잘못된 명령어 입력입니다.\n\n" + 
								"[단어, 시작단어] 중 입력해 주세요."
							);
							return;
						}
					}
					break;
				}

				case "AI" : {
					if (data['power']) {
						Bot.reply("게임이 이미 진행 중입니다.");
						return;
					}
					if (!data['created']) {
						Bot.reply("현재 생성된 게임이 없습니다.");
						return;
					}
					if (data['manager'] != sender) {
						Bot.reply("생성자(방장)만 입력이 가능합니다.");
						return;
					}
					switch (input2) {
						case "추가" : {
							let ai = data['ai'];
							if (ai['power']) {
								Bot.reply("이미 추가한 [ " + ai['name'] + " ] (이)가 있습니다.");
								return;
							}

							switch (input3) {
								case "초보" : {
									ai['level'] = 1;
									ai['name'] = "AI:초보";
									break;
								}
								case "중수" : {
									ai['level'] = 2;
									ai['name'] = "AI:중수";
									break;
								}
								case "고수" : {
									ai['level'] = 3;
									ai['name'] = "AI:고수"
									break;
								}

								default : {
									Bot.reply(
										"잘못된 명령어 입력입니다.\n\n" + 
										"[초보, 중수, 고수] 중 선택해 주세요"
									);
									return;
								}
							}

							// 똑같은 해시 값을 가지는 프로필은 존재 X
							ai['id'] = "@" + ai['name'] + ":555555555";

							/* ai['player'] = */ Game.join(ai['id'], ai['name']);

							Bot.reply(
								"[ " + ai['name'] + " ] 를 게임에 추가했습니다.\n\n" +
								"현재 참가자 : " + data['players'].map(player => player['name']).join(", ")
							);

							ai['power'] = true;

							break;
						}

						case "삭제" : {
							let ai = data['ai'];
							if (!ai['power']) {
								Bot.reply("현재 추가된 AI가 없습니다.");
								return;
							}
							// AI 관련 값 초기화
							ai['power'] = false;
							ai['id'] = null;
							ai['name'] = null;
							ai['level'] = 0;
							break;
						}

						default : {
							Bot.reply(
								"잘못된 명령어 입력입니다.\n\n" + 
								"[추가, 삭제] 중 입력해 주세요."
							);
							return;
						}
					}
					break;
				}

				default : {
					Bot.reply(
						"잘못된 명령어 입력입니다.\n\n" + 
						"[도움말, 게임, 모드, (사전, 검색), AI] 중 입력해 주세요."
					);
					return;
				}
			}
		}
	},
};

function response(room, message, sender, isGroupChat, replier, imageDB) { 
	try {
		Bot.reply = function(message) {
			replier.reply(message);
		};
		Bot.error = function(e) {
			replier.reply(
				"[ Bot Error ]\n\n" +
				"Name : " + e.name + "\n" + 
				"Message : " + e.message + "\n" +
				"Stack : " + e.stack + "\n" +
				"Line : " + e.lineNumber
			);
		}

		// 유저가 원치않는 방이 아니라면
		if (!GAME_ROOM_FILTER.includes(room)) {
			Game.main(room, message, sender, imageDB);
		}
	}
	catch(e) { Bot.error(e); }
}

function onStartCompile() {
	Timer.stop();
}