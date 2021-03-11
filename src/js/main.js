var app = new Vue({
    el: '#app',
    data:{
        version: "0.0",
        mode: -1,
        schoolList: [],
        schoolGroupList: [],
        targetSchoolList: [],
        menuGroupList:[],
        monthlyMenuList:[],
        targetMenuList:[],
        ingredientList:[],
        targetDate:'',
        schoolName:'',
        energy:'',
        protein:'',
    },
    created(){
        fetch('./data/school/school.csv')
            .then(res => res.text())
            .then(schoolList => (this.convertSchoolCsvToDictionary(schoolList)));

        this.checkCookies();
    },
    methods:{
        resetCookies(){
            console.debug('resetCookies() ---->')
            console.debug(this.$cookies.keys());
            this.$cookies.keys().forEach(cookie => {
                this.$cookies.remove(cookie);
                location.reload();
            });
        },
        checkCookies(){
            console.debug('checkCookies() ---->');
            this.$cookies.config(60 * 60 * 24 * 30, '');
            setTimeout(function() {
                if(this.$cookies.isKey('schoolGroup') && this.$cookies.isKey('menuGroup')) {
                    this.mode = 2;
                    this.schoolName = this.$cookies.get('schoolName');
                    this.getMenuCsvFile();
                } else {
                    this.mode = 0;
                }
            }.bind(this), 1000);
        },
        convertSchoolCsvToDictionary(str){

            let lines = str.split('\r\n');
            lines.shift();
            let schoolList = [];

            for (let i = 0; i < lines.length; i++) {
                line = lines[i].split(',');

                let school = {}
                school.schoolGroup = line[0]
                school.menuGroup = line[1]
                school.schoolName = line[2]

                if (!(this.schoolGroupList.includes(school.schoolGroup) )) {
                    this.schoolGroupList.push(school.schoolGroup);
                }
                this.schoolList.push(school);
            }
        },
        convertMenuCsvToDictionary(str){
            console.debug(str);
            let lines = str.split('\r\n');
            line = Encoding.convert(lines, 'UNICODE', 'SJIS');
            console.debug(lines);
            // return lines
        },
        setSchoolGroup(group) {
            // 選択されたSchoolGroupをcookieにセットして描画のmodeを変更する.
            console.debug('setSchoolGroup() ---->  ', group, this.targetSchoolList);
            this.$cookies.set('schoolGroup', group);
            this.mode = 1;

            this. setSchoolCandidateList()
        },
        setSchoolCandidateList() {
            console.debug('setSchoolCandidateList() ---->  ');
            this.targetSchoolList = this.schoolList.filter( item => item.schoolGroup === this.$cookies.get('schoolGroup'));
            let menuGroupList = this.targetSchoolList.map(function(row){
                return row["menuGroup"]
            })
            this.menuGroupList = [...new Set(menuGroupList)]
            console.debug(this.targetSchoolList)
        },
        setUserSettingsToCookie(schoolName, menuGroup){
            console.debug('setUserSettingsToCookie() ----> ', schoolName, menuGroup);
            this.$cookies.set('schoolName', schoolName);
            this.$cookies.set('menuGroup', menuGroup);
            this.mode = 2;

            this.schoolName = schoolName;
            this.getMenuCsvFile();
        },
        getMenuCsvFile(){
            // cookieから表示するcsvのデータを選択して保存する。
            // 生駒市の場合:
            // ex) ea-kondate2103.csv (2021年3月の小学校A献立)
            //    　・小学校 => e
            //      ・A献立 => a, B献立 => b
            //      
            // ex) j-kondate2103.csv (2021年3月の中学校献立)
            //      ・中学校 => j
            //      ・献立は１種類のみ
            let targetCsv = '';

            if (this.$cookies.get('schoolGroup') == '小学校') {
                targetCsv += ('e' + this.$cookies.get('menuGroup').toLowerCase() + '-');
            }else {
                targetCsv += 'j-';
            }

            targetCsv += 'kondate' + this.getFormatedDate(new Date(), 'csv') + '.csv'
            const url = './data/menu/' + targetCsv;

            console.debug(url);
            this.getMonthlyMenuList(url);

        },
        stringToArray(str) {
            var array = [],i,il=str.length;
            for(i=0;i<il;i++) array.push(str.charCodeAt(i));
            return array;
        },
        getMonthlyMenuList(url){
            let monthlyMenuList = [];

            axios({
                url: url,
                method: 'GET',
                responseType: 'blob',
              })
              .then((response) =>{
                let reader = new FileReader();
                reader.readAsBinaryString(new Blob([response.data], {type: 'text/csv'}));
                reader.onload = function (event) {
                    const result = event.target.result;
                    const sjisArray = this.stringToArray(result);
                    const uniArray = Encoding.convert(sjisArray, {to:'UNICODE', from:'SJIS'});
                    monthlyMenuList = Encoding.codeToString(uniArray).replace(/\"/g, "").split('\r\n');
                    monthlyMenuList.shift();
                    console.debug('MonthlyMenuList: ', monthlyMenuList);
                    this.setMonthlyMenuList(monthlyMenuList);

                    let today = this.getFormatedDate(new Date(), 'menu');
                    this.targetDate = today;
                    let targetMenu = this.getTargetMenuList(monthlyMenuList, today);
                    console.debug('Today: ', targetMenu);

                }.bind(this);
              });

            return this.monthlyMenuList
        },
        getTargetMenuList(menuList, date){
            let targetMenuList = menuList.filter( function(el) {
                return el.split(',')[0] == date
            });

            for (let i = 0; i < targetMenuList.length; i++) {
                let menuLine = targetMenuList[i].split(',');
                if ( i == 0 ){
                    this.energy = menuLine[5];
                    this.protein = menuLine[6];
                    console.debug()
                }
                if (!(this.targetMenuList.includes(menuLine[2]))) {
                    this.targetMenuList.push(menuLine[2]);
                }
            }
            return this.targetMenuList
        },
        setMonthlyMenuList(menuList){
            this.monthlyMenuList = menuList;
        }
        ,
        showYesterdayMenu(){
            let date = this.targetDate;
            this.targetDate = this.calcFormatedDate(date, -1);
            this.targetMenuList = [];
            let targetMenuList = this.getTargetMenuList(this.monthlyMenuList, this.targetDate);
            console.debug('showYesterdayMenu: ', targetMenuList);
        }
        ,showTomorrowMenu(){
            let date = this.targetDate;
            this.targetDate = this.calcFormatedDate(date, 1);
            this.targetMenuList = [];
            let targetMenuList = this.getTargetMenuList(this.monthlyMenuList, this.targetDate);
            console.debug('showTomorrowMenu: ', targetMenuList);
        },
        getFormatedDate(date, mode){
            // 生駒市が提供しているcsvファイルの命名規則で 年月 が 2021年3月の場合 2103 
            // のように表現されるためそのフォーマットで日付文字列を返す。
            let formatedStringDate = '';

            const year = date.getFullYear().toString();
            let month = (date.getMonth() + 1).toString();

            // 1 : csvファイル名フォーマット
            // 2 : 献立取得用フォーマット
            if (mode == 'csv') {
                if (month.length == 1) {
                    month = '0' + month
                }
                formatedStringDate = (year.slice(2,4) + month)
            } else if (mode == 'menu'){
                const day = date.getDate().toString();
                formatedStringDate = year + '/' + month + '/' + day
            }

            return formatedStringDate
        },
        calcFormatedDate(strDate, mode){
            
            let formatedStringDate = '';
            let date = new Date(strDate);
            // mode : 
            // -1: 前日
            // 1 : 翌日
            if ( mode == -1 ){
                let yesterday = new Date(date.setDate(date.getDate() - 1));
                console.debug(yesterday);
                formatedStringDate = yesterday.toLocaleDateString();
            } else if ( mode == 1 ) {
                let tomorrow = new Date(date.setDate(date.getDate() + 1));
                console.debug(tomorrow);
                formatedStringDate = tomorrow.toLocaleDateString();
            }

            console.debug('calcFormatedDate: ', formatedStringDate);

            return formatedStringDate
        },
        getMenuIngredient(menu){
            // TODO: ポップアップウィンドウを表示
            // 日にちとメニュに一致するArrayを取得
            let ingredientList = [];
            let date = this.targetDate;
            let menuList = this.monthlyMenuList.filter( function(el) {
                return (el.split(',')[0] == date && el.split(',')[2] == menu);
            });

            for (let i=0; i < menuList.length; i++){
                ingredientList.push(menuList[i].split(',')[3])
            }

            this.ingredientList = ingredientList;
        },
        getMenuImage(menu){
            // 献立
            const regexp = new RegExp(menu);
            let image = '';

            if (regexp.test('ごはん')){
                iamge = 'food_rice.png'
            } else if (regexp.test('牛乳') || regexp.test('ぎゅうにゅう') ){
                image = 'food_milk.png'
            } else if (regexp.test('コロッケ') || regexp.test('からあげ')){
                image = 'food_croquette.png'
            } else if (regexp.test('あげ')){
                image = 'food_fried.png'
            } else if (regexp.test('パン')){
                image = 'food_bread.png'
            } else if (regexp.test('ナン')){
                image = 'food_nan.png'
            } else if (regexp.test('うどん') || regexp.test('めん') || regexp.test('麺')){
                image = 'food_noodle.png'
            } else if (regexp.test('さば') || regexp.test('タラ') || regexp.test('さば') || regexp.test('さわら')){
                image = 'food_fish.png'
            } else if (regexp.test('みそしる') || regexp.test('じる')){
                image = 'food_misosoup.png'
            } else if (regexp.test('スープ')){
                image = 'food_soup.png'
            } else if (regexp.test('ソテー') || regexp.test('あえ')  || regexp.test('おひたし') || regexp.test('サラダ')){
                image = 'food_kobachi.png'
            } else if (regexp.test('いため') || regexp.test('やさい')){
                image = 'food_vegetables.png'
            } else if (regexp.test('ゼリー')){
                image = 'food_jelly.png'
            } else if (regexp.test('フルーツ')){
                image = 'food_fruits.png'
            }
            
            return image
        }
    },
    computed: {
        isSplashScreenShown: function() {
            return this.mode == -1;
        },
        isSchoolGroupSelectorShown: function() {
            return this.mode == 0;
        },
        isMenuGroupSelectorShown: function(){
            return this.mode == 1;
        },
        isDailyMenuShown: function() {
            return this.mode == 2;
        }
    }
});
 


// var array = { '小学校': [
//     { 'A': ['あすか野小学校','生駒南二小学校','生駒北小学校','生駒南小学校','壱分小学校','真弓小学校','鹿ノ台小学校','生駒台小学校','俵口小学校','生駒東小学校','生駒小学校'] },
//     { 'B': ['桜ヶ丘小学校','生駒台小学校','俵口小学校','生駒東小学校生駒小学校桜ヶ丘小学校'] }],
//     '中学校': [
//     { 'A': ['生駒中学校','生駒南中学校','生駒北中学校','緑ヶ丘中学校','鹿ノ台中学校','上中学校','光明中学校','大瀬中学校'] }]
// }