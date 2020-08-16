var config = {
	host: 'qap.turismo.gov.br',
	prefix: '/',
	port: '80',
	isSecure: false
};
require.config( {
	baseUrl: ( config.isSecure ? "https://" : "http://" ) + config.host + (config.port ? ":" + config.port : "") + config.prefix + "resources"
} );

var app = null;

function exportar(context, id) {

	app.visualization.get(id).then(function(vis){
		
		let settings = null;

		switch(context) {
			case 'pdf':
				settings = { documentSize: 'a4', aspectRatio: 2, orientation: "landscape" };

				vis.exportPdf(settings).then(function (link) {
					window.open(link);
				});

				break;
			case 'img':
				settings = { format: 'png', height: 1080, width: 1920 };

				vis.exportImg(settings).then(function (link) {
					window.open(link);
				});
				
				break;
			case 'data':
				settings = {format:'OOXML', state: 'A'};

				vis.exportData(settings).then(function (link) {
					window.open(link.split('qap.turismo.gov.br:80')[1]);
				});

				break;
		}
	});
}

function telaCheia(id, type) {

	var obj = '';

	switch(type) {
		case 0:
			obj = 'fullscreen_map';
			$('#fullscreen_baruf').css('display', 'none');
			$('#fullscreen_baratividade').css('display', 'none');
			$('#fullscreen_map').css('display', 'block');
			break;
		case 1:
			obj = 'fullscreen_baruf';
			$('#fullscreen_map').css('display', 'none');
			$('#fullscreen_baratividade').css('display', 'none');
			$('#fullscreen_baruf').css('display', 'block');
			break;
		case 2:
			obj = 'fullscreen_baratividade';
			$('#fullscreen_map').css('display', 'none');
			$('#fullscreen_baruf').css('display', 'none');
			$('#fullscreen_baratividade').css('display', 'block');
			break;
	}

	$('#exampleModal').on('shown.bs.modal', function (e) {
		app.getObject(obj, id);
	})
}

require( ["js/qlik"], function ( qlik ) {
	qlik.on( "error", function ( error ) {
		$( '#popupText' ).append( error.message + "<br>" );
		$( '#popup' ).fadeIn( 1000 );
	} );
	$( "#closePopup" ).click( function () {
		$( '#popup' ).hide();
	} );
	
	qlik.theme.apply('breeze');
    
    var js = document.createElement("script");
    js.type = "text/javascript";
    js.src = 'js/barra.js';
	document.body.appendChild(js);

    app = qlik.openApp('d87afea8-b33f-49cc-b8b8-df7f9c15d01d', config);

	app.getObject('map','hzFbqD').then(() => {
		setTimeout(() => {  
			$('.loading').css('opacity', 0);

			setTimeout(() => {
				$('.loading').css('display', 'none');
				$('body').css('overflow', 'auto');
			}, 500);
		}, 3500);
	});

	app.getObject('chart-uf','KFJR');

	app.getObject('chart-atividade','aQjdxhq');
	
	app.getObject('filters1','TAqzYx');
	app.getObject('filters2','gbKhK');
	app.getObject('filters3','jPuBZ');
	// app.getObject('filters4','VNNGwbM');
	app.getObject('filters4','MdpZME');

	// app.getObject('filters5','MdpZME');
	// app.getObject('filters6','vkmUQWw');

	app.createGenericObject({
		selos: {
			qValueExpression: "=Count(nu_pj_selo)"
		}
	}, (reply) => {

		$('#qtd-selos').html(reply.selos ? reply.selos.toLocaleString('pt-br') : 0);
	})
} );

function exportData() {

	$('body').css('overflow', 'hidden');
	$('#open-export').css('display', 'flex');

	setTimeout(() => {
		$('#open-export').css('opacity', 1);
	}, 150);

	app.createGenericObject({
		selos: { qValueExpression: "=Count(nu_pj_selo)" }
	}, (reply) => {
	
		const template = [
			["", "", "", "", ""],
			["Turismo Responsável - Selos Emitidos", "", "", "", ""],
			["Fonte: Ministério do Turismo", "", "", "", ""],
			[`Dados gerados em ${new Date().toLocaleString()}`, "", "", "", ""],
			["", "", "", "", ""],
			["UF", " Município", "Data", "Atividade", "Nome fantasia/Nome do guia"]
		];
		
		recursiveSequentialFetch({ from: 0, data: template, maxCalls: reply.selos, qtd: 1000 })
			.then(res => {

				var csvString = res.data.map(e => e.join(";")).join("\n");

				csvData = new Blob([csvString], { type: 'text/csv' }); 
				var csvUrl = URL.createObjectURL(csvData);
				var a = document.createElement('a');
				a.target      = '_blank';
				a.download    = 'TurismoResponsavelDadosAbertos.csv';
				a.href 		  =  csvUrl;
				document.body.appendChild(a);
				a.click();
				
				$('#open-export').css('opacity', 0);

				setTimeout(() => {
					$('#open-export').css('display', 'none');
					$('body').css('overflow', 'auto');
				}, 500);

			})
			.catch(err => {
				console.log(err);
		});

		app.destroySessionObject(reply.qInfo.qId);
	});
}

async function recursiveSequentialFetch({ from, data, maxCalls, qtd }) {
	let cube = await fetchData({ from, qtd });

	cube.forEach(element => {
		data.push(element);
	});

	if (from+qtd < maxCalls) {
	  return recursiveSequentialFetch({ from: from + qtd, data, maxCalls, qtd });
	} else {
	  return { from, data, maxCalls, qtd };
	}
}

async function fetchData({ from, qtd }) {
	var temp_dataset = [];

	await app.createCube({
		qDimensions : [
			{ qDef : { qFieldDefs : ["UF"] } },
			{ qDef : { qFieldDefs : ["Município"] } },
			{ qDef : { qFieldDefs : ["dt_aceite_selo"] } }, 
			{ qDef : { qFieldDefs : ["no_atividade"] } },
			{ qDef : { qFieldDefs : ["no_fantasia"] } },
			{ qDef : {qFieldDefs : ["nu_pj_selo"] } }
		],
		qInitialDataFetch : [{
			qTop : from,
			qLeft : 0,
			qHeight : qtd,
			qWidth : 6
		}]
	}, function(row) {

		row.qHyperCube.qDataPages[0].qMatrix.forEach(element => {
			const temp = [
				element[0].qText,
				element[1].qText,
				element[2].qText,
				element[3].qText,
				element[4].qText
			];

			temp_dataset.push(temp);
			
		});

		app.destroySessionObject(row.qInfo.qId);

	});

	return temp_dataset;
}
