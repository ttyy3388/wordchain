// importPackage(android.io);
importPackage(org.jsoup);

importPackage(java.security);
importPackage(java.lang);
importPackage(java.net);
importPackage(java.io);

const BOT_SCRIPT_NAME = "Update.js"; // 해당 봇(스크립트)의 파일 이름
const GAME_WORD_COMMAND = "::"; // 끝말잇기 단어 입력 시 사용할 명령어 (예시: "::사과", "::과자" 등)
const BOT_COMMAND_WORD = "/끝말잇기"; // 끝말잇기 명령어 입력 시 사용할 글자 (예시: "/끝말잇기 참가", "@끝말잇기 참가" 등)
const GAME_ROOM_FILTER = []; // 끝말잇기 기능을 사용하지 않을 방 목록 (예시: ["방1", "방2"])
const GAME_WORD_FILTER = []; // 끝말잇기 금지어를 설정하는 기능 (에시: ["바보", "멍청이"])
const GAME_TIMER_OUT = 15; // 끝말잇기 턴 넘기기 타이머 시간 (즉, 설정한 시간 이상 응답이 없으면 아웃)
const BOT_DELAY_TIME = 2; // AI 추가 시 너무 빠르게 답장하는 것을 방지하기 위한 딜레이

const Bot = {
	/*
	 * type: String
	 * text: String
	 * list: Array
	 */

	/* print : function(type) {
		let reply = null;
		switch (type) {
			case "LIFE_TIME_OUT": {
				let player = arguments[2],
					list = arguments[3];
				reply = 
					"< 시간 초과 >\n\n" + 
					"[ " + player + " ] 님이 라이프가 0이 되어 아웃되었습니다.\n\n" +
					"< 남은 플레이어 >\n" + 
					;
				break;
			}
		}
	} */

	/* reply : function() {
		
	}, */

	/* message : function(type, ...text) {
		
	} */
};

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
String.prototype.getFirst = function() {
	return this[0] /* .getDoum() */;
}
String.prototype.getLast = function() {
	return this[this.length - 1] /* .getDoum() */;
}

Object.values = function(object) {
	return Object.keys(object).map(key => object[key]);
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
		'manager': false,
		'created': false,
		'players': [/* {
			names: function() {
				return data['players'].map(player => player['name']);
			}
		} */ ],
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
			// created: false,
			'level': 0,
			'name': null,
		}
	},

	// AIData : {},
	StartWord : [],
	WordList : [],
	UsedWord : [],

	load : function() {
		DB.StartWord = JSON.parse(DB.get("StartWord"));
		DB.WordList = JSON.parse(DB.get("WordList"));

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

	get : function(value) {
		let connect = new URL("https://raw.githubusercontent.com/ttyy3388/wordchain/master/" + value + ".txt").openConnection();

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

	/* post : function(type, value) {
		Jsoup.connect("https://ttyy3388.develope.dev/postData.php").data("type", type, "value", value).method(Connection.Method.POST).execute().parse();
	}, */

	// DB가 로딩됐는지 확인하는 함수
	check : function() {
		return (Object.keys(DB.StartWord).length && Object.keys(DB.WordList).length); 
	}
};

const AI = {
	getReply : function(word) {
		Thread.sleep(BOT_DELAY_TIME * 1000);
		return GAME_WORD_COMMAND + AI.getWord(word);
	},

	// 변수 네이밍의 경우 너무 길어지기 때문에 최소화(Reply(r), Start(s), Word(w), Doum(d))
	// 또한 계산 속도를 생각하여 AI 계산 부분은 [Optimized for loop]를 사용함
	getWord : function(word) {
		let data = DB.GameData;
		// (*) 설명을 위해 유저가 입력한 단어가 "사랑"이라고 가정
		let swords = DB.StartWord[word.getLast()], // "사랑"의 마지막 글자인 "랑"으로 시작하는 단어 목록
			dswords = DB.StartWord[word.getLast().getDoum()]; // "랑"에 두음을 적용한 "낭"로 시작하는 단어 목록

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
			// 실패 출력
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
			rswords = DB.StartWord[rword.getLast()];
			drswords = DB.StartWord[rword.getLast().getDoum()];
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

const Word =
{
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
		if (!lchar.equals(fchar)) {
			let doum = lchar.getDoum();
			// 두음 법칙을 적용해도 일치하지 않으면
			if (doum != fchar) {
				// 예시: 소라를 입력했다면 "라(나)"(으)로 시작하는 ... 로 표시"
				let doummsg = lchar != doum ? lchar + "(" + doum + ")" : lchar; 		
				Bot.reply("\"" + doummsg + "\"(으)로 시작하는 단어를 입력해 주세요."); 
				return false;
			}
			// 두음 법칙을 적용했을 때 일치한다면
			return true;
		}
		
		return true;
	},

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

	isUsed : function(word) {
		return DB.UsedWord.includes(word);
	},

	isForbidden : function(word) {
		return GAME_WORD_FILTER.includes(word);
	},

	isOneCom : function(word) {
		let lchar = word.getLast(),
			doum = lchar.getDoum();
		return !(DB.StartWord[lchar] || DB.StartWord[doum]);
	},

	getMean : function(word) {
		// 해당 단어가 존재하지 않으면
		if (!Word.isWord(word)) {
			return "";
		}
		return DB.WordList[word];
	},

	// (apply: 조건 적용 여부)
	getRandom : function(check) {
		let list = Object.keys(DB.WordList), word = null, count = 0;
		let mode = DB.GameData['mode'];

		while (true) {
			// 100번 시도해도 안되면 문제가 발생했다고 인식
			if ((count ++) > 99) {
				Bot.reply("무작위 단어 계산 중 문제가 발생했습니다.");
				return null;
			}

			word = list[Math.floor(Math.random() * list.length)];

			// 조건 적용 옵션이 켜져있다면
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
			else {
				// 단어 반환
				return word;
			}
		}
	}
}

const Timer = {
	start : function() {
		let data = DB.GameData['timer'];
		// 타이머 쓰레드 자체를 전역 값으로 지정
		data['thread'] = new Thread({ 
			run : function() {
			try {
				while (data['power']) {
					Thread.sleep(1000);
						
					// 타이머 시간 초과 시
					if (data['count'] >= GAME_TIMER_OUT) {
						Game.timeout(); // 플레이어 타임아웃 처리
						data['count'] = 0; // 타이머 시간 초기화
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
			catch(e) { Bot.error(e); }
		}});

		// 타이머 쓰레드 동작
		data['thread'].start();
	},

	stop : function() {
		let data = DB.GameData['timer'];

		// 타이머 관련 값 초기화
		data['count'] = 0;
		data['power'] = false;
		
		/* try {
			// 쓰레드를 가져왔다면 정지
			// data['thread'].interrupt();
		}
		catch(e) {
			// 모종의 이유로 쓰레드를 정지시키지 못했다면
		} */
		return true;
	}
}

const Game =
{
	/* init : function() {
		DB.GameData = {
			'power': false,
			'players': [],
		};
	}, */

	// Return -1: DB ERROR
	start : function() {
		// 데이터 베이스 로드
		if (!DB.load()) {
			return -1;
		}

		// 관련 값 기록
		/* let date = new Date(),
		 	hour = date.getHours(),
			minute = date.getMinutes();
		DB.GameData['StartTime'] = */
	   	
		// 게임 데이터 입력
		DB.GameData['word'] = Word.getRandom(true); // 무작위 단어로 시작
	   	DB.GameData['power'] = true;

		// 타이머 동작
		Timer.start();

		return 1;
	},

	create : function(room, manager) {
        // 게임 데이터 입력
		// DB.GameData['turn'] = 0;
		DB.GameData['room'] = room;
		// DB.GameData['power'] = false;
		DB.GameData['manager'] = manager;
		DB.GameData['created'] = true;
		// DB.GameData['players'] = [];
		// DB.GameData['round'] = 0;
		// DB.GameData['onecom'] = false;
	},

	off : function() {
		Timer.stop();
		Api.reload(BOT_SCRIPT_NAME);
	},

	reset : function() {
		/* DB.GameData = {
			'power': false,
			'players': [],
		}; */
	},

	restart : function() {

	},

    
	/* 플레이어 관련 */
	// 단어 입력 성공 시 호출
	/* success : function(player) {
		
	}, */
	// 플레이어가 아웃됐을 때 호출(player: 플레이어 정보, msgobj: 출력 메시지)
	/* out : function(player, msgobj) {
		let data = DB.GameData;
			
		let	xplayer = data['players'][data['turn'] + 1]; // 다음 플레이어 정보

		// 남은 플레이어가 2명(1대1 상황)이라면
		if (data['players'].length == 2) {
			Bot.reply(msgobj['off']);
			Game.off(); // 게임 종료 처리
		}
		else {
			// 해당 플레이어가 마지막 차례라면
			if (data['turn'] == data['players'].length) {
				data['turn'] = 0 // 턴을 첫번째로 넘김
			}

			// 게임에서 아웃 처리
			data['players'].splice(data['players'].indexOf(xplayer), 1);

			Bot.reply(msgobj['out']);

			Bot.reply("[ " + xplayer['name'] + " ] 님은 새로운 단어를 입력해 주세요.");

			// 다음 턴이 AI 차례라면
			if (xplayer == data['ai']['name']) {
				// 아웃시에는 랜덤 단어 계산
				let reply = AI.getReply(Word.getRandom());
				// 이후 AI가 대답한 단어를 전송
				Game.main(data['room'], reply, data['ai']['name']);
			}
		}
	}, */
	/* kickout: function(target) {
		let data = DB.GameData;
			
		let	xplayer = data['players'][data['turn'] + 1]; // 다음 플레이어 정보

		Game.out({
			'off': "< 플레이어 추방 >\n\n" +
			"[ " + sender + " ] 님이 추방되어 게임을 종료합니다.\n\n" +
			"승자는 [ " + xplayer['name'] + " ] 님 입니다!",
			'out': "< 기권 패배 >\n\n" +
			"[ " + sender + " ] 님이 추방되었습니다.\n\n" +
			"< 남은 플레이어 >\n" + data['players'].map(player => player['name']).join(", ")
		});
	}, */
	giveup : function(sender) {
		let data = DB.GameData;
			
		let	tplayer = null; // 대상 플레이어 정보

		data['players'].forEach(player => {
			if (player['name'] != sender) {
				return;
			}
			tplayer = player;
		});
		
		// 대상 플레이어 값을 찾지 못했다면
		if (!tplayer) {
			return -1;
		}
		
		position = data['players'].indexOf(tplayer),
		xplayer = data['players'][position + 1]; // 다음 플레이어 정보

		// 다음 플레이어가 없다면 첫번째 플레이어 지정
		if (!xplayer) { xplayer = data['players'][0]; }

		/* Game.out({
			'off': "< 기권 패배 >\n\n" +
			"[ " + sender + " ] 님이 기권하여 게임을 종료합니다.\n\n" +
			"승자는 [ " + xplayer['name'] + " ] 님 입니다.!",
			'out': "< 기권 패배 >\n\n" +
			"[ " + sender + " ] 님이 기권하여 아웃되었습니다.\n\n" +
			"< 남은 플레이어 >\n" + data['players'].map(player => {
				if (player['name'] != sender) {
					return player['name'];
				}
			}).join(", ")
		}); */

		if (data['players'].length == 2) {
			Bot.reply(
				"< 기권 패배 >\n\n" +
				"[ " + tplayer['name'] + " ] 님이 기권하여 게임을 종료합니다.\n\n" +
				"승자는 [ " + xplayer['name'] + " ] 님 입니다.!",
			);
			Game.off();
		}
		else {
			// 게임에서 아웃 처리
			data['players'].splice(position, 1);
			
			Bot.reply(
				"< 기권 패배 >\n\n" +
				"[ " + tplayer['name'] + " ] 님이 기권하여 아웃되었습니다.\n\n" +
				"< 남은 플레이어 >\n" +
				data['players'].map(player => player['name']).join(", ")
			);

			// 해당 플레이어가 마지막 차례였다면
			/* if (data['turn'] >= data['players'].length) {
				data['turn'] = 0 // 턴을 첫번째로 넘김
			} */
			// 해당 플레이어 차례가 아닌데 아웃이라면
			if (data['turn'] != position) {
				// 이미 단어를 입력한 경우(차례 < 턴)
				if (data['turn'] < position) {
					// 플레이어가 첫번째 차례가 아니면
					if (data['turn'] != 0) {
						// 게임 턴을 1회 뺌
						data['turn'] -= 1
					}
					// 첫번째 차례라면 상관 X
				}	
			}
			// 자기 차례인데 아웃이라면
			else {
				// 해당 플레이어가 마지막 차례라면
				if (position >= data['players'].length) {
					data['turn'] = 0 // 턴을 첫번째로 넘김
				}
				// 새로운 단어(랜덤) 제시
				let word = Word.getRandom(true),
					lchar = word.getLast(), 
					doum = lchar.getDoum(),
					doummsg = (doum) ? lchar + "(" + doum + ")" : lchar; 

				Bot.reply("[ " + xplayer['name'] + " ] 님은 \"" + doummsg + "\"(으)로 시작하는 단어를 입력해 주세요.");

				// 단어 재 지정
				data['word'] = word;
			}

			// 다음 턴이 AI 차례라면
			if (xplayer['name'] == data['ai']['name']) {
				let reply = AI.getReply(data['word']);
				// 이후 AI가 대답한 단어를 전송
				Game.main(data['room'], reply, data['ai']['name']);
			}
		}
	},
	// 타이머 시간 초과 시 호출
	timeout : function() {
		let data = DB.GameData,
			timer = data['timer'];
			
		let	nplayer = data['players'][data['turn']], // 현재 플레이어 정보
			xplayer = data['players'][data['turn'] + 1]; // 다음 플레이어 정보

		// 다음 플레이어가 없다면 첫번째 플레이어 지정
		if (!xplayer) { xplayer = data['players'][0]; }

		// 라이프 감소 처리 및 탈락 대상자인지 확인
		if ((nplayer['life'] -= 1) <= 0) {
			// 아웃 이벤트 실행 및 메시지 입력
			/* Game.out({
				'off': "< 시간 초과 >\n\n" + 
				"[ " + nplayer['name'] + " ] 님이 라이프가 소진되어 게임을 종료합니다.\n\n" +
				"승자는 [ " + xplayer['name'] + " ] 님 입니다.!",
				'out': "< 시간 초과 >\n\n" + 
				"[ " + nplayer['name'] + " ] 님이 라이프가 0이 되어 아웃되었습니다.\n\n" +
				"< 남은 플레이어 >\n" + data['players'].map(player => {
					if (player['name'] != nplayer['name']) {
						return player['name'];
					}
				}).join(", ")
			}); */
			if (data['players'].length == 2) {
				Bot.reply(
					"< 시간 초과 >\n\n" + 
					"[ " + nplayer['name'] + " ] 님이 라이프가 소진되어 게임을 종료합니다.\n\n" +
					"승자는 [ " + xplayer['name'] + " ] 님 입니다.!"
				);
				Game.off(); // 게임 종료 처리
			}
			else {
				// 해당 플레이어가 마지막 차례라면
				if (data['turn'] >= data['players'].length) {
					data['turn'] = 0 // 턴을 첫번째로 넘김
				}
	
				// 게임에서 아웃 처리
				data['players'].splice(data['players'].indexOf(xplayer), 1);
	
				Bot.reply(
					"< 시간 초과 >\n\n" + 
					"[ " + nplayer['name'] + " ] 님이 라이프가 0이 되어 아웃되었습니다.\n\n" +
					"< 남은 플레이어 >\n" + 
					data['players'].map(player => player['name']).join(", ")
				);
				
				// 새로운 단어(랜덤) 제시
				let word = Word.getRandom(true),
					lchar = word.getLast(), 
					doum = lchar.getDoum(),
					doummsg = (doum) ? lchar + "(" + doum + ")" : lchar;
				
				Bot.reply("[ " + xplayer['name'] + " ] 님은 \"" + doummsg + "\"(으)로 시작하는 단어를 입력해 주세요.");
			
				// 단어 재 지정
				data['word'] = word;

				// 다음 턴이 AI 차례라면
				if (xplayer['name'] == data['ai']['name']) {
					let reply = AI.getReply(word);
					// 이후 AI가 대답한 단어를 전송
					Game.main(data['room'], reply, data['ai']['name']);
				}
			}
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

    join : function(sender) {
		let data = DB.GameData;

		// 플레이어 정보 업데이트
		data['players'].push({
			'name': sender,
			'life': 3,
			// 'score': 0,
		});
    },

	main : function(room, message, sender) { 
		let isWordCmd = message.startsWith(GAME_WORD_COMMAND),
			isBotCmd = message.startsWith(BOT_COMMAND_WORD);
	
		// 명령어를 입력하는 경우만 동작
		if (!(isWordCmd || isBotCmd)) {
			return ;
		}

		let data = DB.GameData,
			used = DB.UsedWord;

		if (isWordCmd) {
			if (!data['power']) {
				return ;
			}
			
			let word = message.substring(GAME_WORD_COMMAND.length).trim(), index = 0;

			for (let player of data['players']) {
				if (sender == player['name'] & // 플레이어 이름이 일치하는지
				   (index ++) == data['turn']) { // 해당 플레이어 차례인지
					if (Word.check(word)) {
						// 다음 턴으로 넘김과 동시에 마지막 순서인지 계산
						if ((data['turn'] += 1) == data['players'].length) {
							// 마지막 순서였다면 처음부터 다시 시작
							data['turn'] = 0;
						}

						// 플레이어 점수 반영
						// player['score'] += (20 * (word.length - 1)) + Math.floor(Math.random() * (10 + (data['round'] / 10)))
		
						// 사용된 단어 추가
						used.push(word);

						// 게임 정보 업데이트
						data['round'] += 1; // 한 라운드 증가
						data['word'] = word; // 입력한 단어 저장
						data['timer']['count'] = 0; // 타이머 시간 초기화

						// 다음 플레이어 계산
						let xplayer = data['players'][data['turn']];

						let mean = Word.getMean(word).join(", "),
							lchar = word.getLast(),
							doum = lchar.getDoum();
							
						let meanmsg = (mean.length > 30) ? mean.substr(0, 25) + ".." : mean;
							doummsg = (doum) ? lchar + "(" + doum + ")" : lchar; 
						
						Bot.reply("< " + meanmsg + " >\n\n" +
							"[ " + player['name'] + " ] 님이 \"" + word + "\" 단어를 입력했습니다.\n" +
							"[ " + xplayer['name'] + " ] 님은 \"" + doummsg + "\"(으)로 시작하는 단어를 입력해 주세요"
						);

						let ai = data['ai'];
						if (ai['power']) {
							// 다음 턴이 AI 차례라면
							if (ai['name'] == xplayer['name']) {
								// AI가 대답한 단어 저장
								let reply = AI.getReply(word);
								// 이후 AI가 대답한 단어를 전송
								Game.main(data['room'], reply, data['ai']['name']);
							}
						}
					}
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
						BOT_COMMAND_WORD + " 게임 [생성 / 참가 / 시작 / 기권 / 종료]\n\n" +
						"[ AI 관련 ]\n" +
						BOT_COMMAND_WORD + " AI 추가 [초보, 중수, 고수]\n\n" +
						"[ 모드 관련 ]\n" +
						BOT_COMMAND_WORD + " 모드 한방단어 [켜기 / 끄기]\n\n" +
						"[ 사전 관련 ]\n" +
						BOT_COMMAND_WORD + " 검색(사전) 단어 \"단어\"\n" +
						BOT_COMMAND_WORD + " 검색(사전) 시작단어 \"글자\"\n\n" +
						"※ 사전 주의사항 : \"단어\"에서 큰따옴표를 포함해야 인식됩니다."
					); 
					break;
				}
				case "게임" : {
					switch(input2) {
						case "생성" : {
							// 이미 생성된 방이 있다면
							if (data['created']) {
								Bot.reply("이미 생성된 게임이 있습니다.");
								return ;
							}
		
							// Game.init();
							Game.create(room, sender);
							Game.join(sender); 
							Bot.reply("[ " + sender + " ] 님이 끝말잇기 게임을 생성했습니다.");
							break;
						}
		
						case "참가" : {
							// 이미 게임이 진행 중이라면
							if (data['power']) {
								Bot.reply("게임이 이미 진행 중입니다.");
								return ;
							}
							// 생성된 방이 없다면
							if (!data['created']) {
								Bot.reply("현재 생성된 게임이 없습니다.");
								return ;
							}
							// 참가 중인 플레이어라면
							let list = data['players'].map(player => player['name']);
							if (list.includes(sender)) {
								Bot.reply("이미 참가 중인 게임이 있습니다.");
								return ;
							}
		
							Game.join(sender);
							Bot.reply(
								"[ " + sender + " ] 님이 게임에 참가했습니다.\n\n" +
								"현재 참가자 : " + data['players'].map(player => player['name']).join(", ")
							);
							break;
						}
		
						case "시작" : {
							// 생성된 게임이 없다면
							if (!data['created']) {
								Bot.reply("생성된 게임이 없습니다.");
								return ;
							}
							// 방장이 아닌 유저가 입력했다면
							if (data['manager'] != sender) {
								Bot.reply("방장만 입력이 가능합니다.");
								return ;
							}
							// 참가한 플레이어가 2명 미만이라면
							if (data['players'].length < 2) {
								Bot.reply("여러명이 참가해야 게임 시작이 가능합니다.");
								return ;
							}
		
							Bot.reply("잠시 후 게임을 시작합니다.!");
		
							Game.start();

							let lchar = data['word'].getLast(), doum = lchar.getDoum(),
								doummsg = (doum) ? lchar + "(" + doum + ")" : lchar; 

							Bot.reply(
								"게임을 시작합니다.\n\n" +
								"< 플레이어 목록 >\n" +
								"[ " + sender + " ] 님은 \"" + doummsg + "\"(으)로 시작하는 단어를 입력해 주세요."
							);
							break;
						}

						case "기권" : {
							// 참가 중인 플레이어가 아니라면
							let list = data['players'].map(player => player['name']);
							if (!list.includes(sender)) {
								Bot.reply("참가 중인 게임이 없습니다.");
								return ;
							}
							Game.giveup(sender);
							break;
						}

						/* case "강퇴" : 
						case "추방" : {
							// 이미 게임이 진행 중이라면
							if (!data['power']) {
								Bot.reply("진행중인 게임이 없습니다.");
								return;
							}
							let target = input3,
								list = data['players'].map(player => player['name']);
							if (!list.includes(target)) {
								Bot.reply("게임에 참가중인 유저가 아닙니다.");
								return;
							}
							Game.giveup(target);
							break;
						} */
		
						case "종료" : {
							Bot.reply("끝말잇기 게임이 종료됩니다.");
							Game.off();
							break;
						}
		
						/* case "재시작" : {
							Bot.reply("현재 인원으로 게임을 재시작합니다.");
							Game.restart();
							break;
						} */

						default : {
							Bot.reply(
								"잘못된 명령어 입력입니다.\n\n" + 
								"(생성, 참가, 시작, 기권, 종료) 중 입력해 주세요."
							);
							return ;
						}
					}
					break;
				}

				case "모드" : {
					// 게임이 진행 중이라면
					// 모드는 게임 중에도 변경 가능
					/* if (!data['power']) {
						Bot.reply("게임이 이미 진행 중입니다.");
						return ;
					} */
					// 생성된 방이 없다면
					if (!data['created']) {
						Bot.reply("현재 생성된 게임이 없습니다.");
						return ;
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
										"(켜기, 끄기) 중 입력해 주세요."
									);
									return ;
								}
							}
							break;
						}
						default : {
							Bot.reply(
								"잘못된 명령어 입력입니다.\n\n" + 
								"(한방단어) 중 입력해 주세요."
							);
							return ;
						}
					}
					break;
				}

				case "사전" :
				case "검색" : {
					if (!DB.check()) {
						Bot.reply("데이터 베이스 로딩 후 검색을 시작합니다.");
						if (!DB.load()) {
							Bot.reply("데이터 베이스 로딩 중 문제가 발생했습니다.");
							return ;
						}
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
									"< \"" + input3 + "\"의 검색 결과 :" + word.length + " 개 >\n\n" +
									text.join("\n\n")
								);
							}
							else {
								Bot.reply("사전에 등록되지 않은 단어입니다.");
								return ;
							}
							break;
						}
						case "시작단어" : {
							let start = message.split("\"")[1];
								list = DB.StartWord;
	
							if (list[start] != null) {
								Bot.reply(
									"<" + start + "(으)로 시작하는 단어 " + list[start].length + "개>\n\n" +
									list[start].join(", ")
								);
							}
							else {
								Bot.reply("\"" + start + "\"(으)로 시작하는 단어는 사전에 없습니다.");
								return ;
							}
						}
					}
					break;
				}

				case "AI" : {
					// 이미 게임이 진행 중이라면
					if (data['power']) {
						Bot.reply("게임이 이미 진행 중입니다.");
						return ;
					}
					// 생성된 방이 없다면
					if (!data['created']) {
						Bot.reply("현재 생성된 방이 없습니다.");
						return ;
					}
					switch (input2) {
						case "추가" : {
							let ai = data['ai'];
							// 이미 추가한 AI가 있다면
							if (ai['power']) {
								Bot.reply("이미 추가한 [ " + ai['name'] + " ]가 있습니다.");
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
									ai['name'] = "AI:고수;"
									break;
								}
								// 올바르지 않은 난이도를 선택했다면
								default : {
									Bot.reply(
										"잘못된 명령어 입력입니다.\n\n" + 
										"(초보, 중수, 고수) 중 선택해 주세요"
									);
									return ;
								}
							}

							Game.join(ai['name']);

							Bot.reply(
								"[ " + ai['name'] + " ] 를 게임에 추가했습니다.\n\n" +
								"현재 참가자 : " + data['players'].map(player => player['name']).join(", ")
							);

							ai['power'] = true;

							break;
						}
					}
					break;
				}

				default : {
					Bot.reply(
						"잘못된 입력입니다.\n\n" + 
						"(도움말, 게임, 모드, [사전, 검색], AI) 중 입력해 주세요."
					);
					return ;
				}
			}
		}
	},
};

function response(room, message, sender, isGroupChat, replier, imageDB) { 
	try {
		if (!Bot.reply) {
			Bot.reply = function(message) {
				replier.reply(message);
			};
		}
		if (!Bot.error) {
			Bot.error = function(e) {
				replier.reply(
					"[ Bot Error ]\n\n" +
					"Name : " + e.name + "\n" + 
					"Message : " + e.message + "\n" +
					// "Stack : " + e.stack + "\n" +
					"Line : " + e.lineNumber
				);
			}
		}

		if (!(room in GAME_ROOM_FILTER)) {
			Game.main(room, message, sender);
		}
	}
	catch(e) { Bot.error(e); }
}