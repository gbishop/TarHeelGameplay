<div id="creator">
	<ul class="tabs">
		<li class="tab-link current" data-tab="quick">Basic</li>
		<li class="tab-link" data-tab="precise">Precise</li>
		<li class="tab-link" data-tab="advanced">Advanced</li>
	</ul>
	<div id="quick" class="tab-content current">
		<p>On this tab you can quickly create a basic interactive gameplay with a fixed interval between prompts.</p>

		<form action="/app2/gameplay.html" method="get" target="_blank" id="quick-gameplay">
		    <div>
		        <label>YouTube Video ID (or URL)
		            <input type="text" name="video" placeholder="YouTube  ID" />
		        </label>
		    </div>
		    <div>
		        <label>Stop interval
		            <input type="number" name="interval" min="5" placeholder="Seconds"
		            	title="Time in seconds between stops." />
		        </label>
		    </div>
		    <div>
		        <label>Message text
		            <input type="text" name="message" placeholder="Prompt" title="Message to display when the video stops" />
		        </label>
		    </div>
		    <div>
		        <label>Start Time (optional)
		            <input type="number" name="start" min="0" placeholder="seconds" />
		        </label>
		    </div>
		    <div>
		        <label>End Time (optional)
		            <input type="number" name="end" min="0" placeholder="seconds" />
		        </label>
		    </div>
		    <div>
		        <button class="play" type="submit" disabled class="thr-blue-button">Play</button>
		    </div>
		</form>
	</div>
	<div id="precise" class="tab-content">
		<p>On this tab you may create a Gameplay where you control the time and text for each prompt.</p>
		<div class="formlike">
			<label>YouTube Video ID (or URL)
				<input type="text" name="video" value="" />
			</label>
			<button class="loadVideo" disabled>Load</button>
		    <div class="player-container">
		        <div class="player"></div>
				<button class="add-pause thr-blue-button">Add A Pause</button>
		        <ul class="timepoints">
                <script id="timepoint" type="text/html">
                	<li class="tp-{{type}}">
            		    <label>{{timeLabel}}:
            		    	<input type="number" name="time" value="{{time}}" step="0.1"
            		    		placeholder="Enter time" title="Use up and down arrow to adjust the time. Use shift for bigger steps." />
            		    </label>
                		{{#single}}
            		    <label>Prompt:
            		    	<input type="text" name="message" value="{{message}}"
            		    		placeholder="Enter message" />
            		    </label>
                		<button class="delete-pause picon" title="delete pause">
                			<i class="fa fa-trash-o" ></i>
                		</button>
                		{{/single}}
                		{{#multiple}}
                		<ol>
                			{{#prompts}}
	                		<li>
		                		<i class="picon delete-prompt fa fa-trash-o" title="delete prompt"></i>
		                		<div>
		                		    <label>Choice:
		                		    	<input type="text" name="message" value="{{message}}"
		                		    		placeholder="Enter message" />
		                		    </label>
		                		</div>
		                		<div>
		                			<label>Action:
		                				<input type="radio" name="action" value="continue"
		                					{{^target}}checked{{/target}}
		                					title="Continue playing the video"/>Continue
		                				<input type="radio" name="action" value="jump"
		                					{{#target}}checked{{/target}}
		                					title="Jump to a new time in the video"/>Jump to:
		                				<input type="number" name="target" value="{{target}}"
		                					placeholder="Enter a time" />
		                			</label>
		                		</div>
	                		</li>
	                		{{/prompts}}
	                		<button class="add-choice thr-blue-button">Add A Choice</button>
	                	</ol>
	                	{{/multiple}}
                	</li>
                </script>
		        </ul>

		    </div>
			<button class="play thr-blue-button">Play</button>

		</div>

	</div>
	<div id="advanced" class="tab-content">
		<p>The advanced creator will eventually appear here</p>
	</div>

	<?php if (is_user_logged_in() ): ?>
		<h2>Save your Gameplay</h2>
		<p>You can play and share your gameplay by clicking the <em>Play</em> button above to open a new window. If you copy and share the URL of that window, anyone may enjoy your gameplay. You may also share your gameplay on our site by submitting the following form:</p>
		<form id="save-gameplay">
			<div>
			    <label>Title
			        <input type="text" name="title" placeholder="Title for your gameplay" />
			    </label>
			</div>
			<div>
				<label>Audience rating
					<select name="rating">
						<option value="E">E/Everybody</option>
						<option value="C">C/Caution</option>
					</select>
				</label>
			</div>
			<div id="errors"></div>
			<div id="messages"></div>
			<button id="save" type="submit" class="thr-blue-button">Save</button>
		</form>

	<?php endif; ?>
	<script src="<?php echo get_stylesheet_directory_uri(); ?>/js/creator.js" ></script>
</div>