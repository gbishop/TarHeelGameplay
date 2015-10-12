<div id="creator">
	<ul class="tabs">
		<li class="tab-link current" data-tab="quick">Basic</li>
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
		        <button id="qplay" type="submit" disabled class="thr-blue-button">Play</button>
		    </div>
		</form>
	</div>
	<div id="advanced" class="tab-content">
		<p>On this tab you may create a Gameplay where you control the time and text for each prompt.</p>
		<div class="formlike">
			<div>
				<label>YouTube Video ID (or URL)
					<input type="text" name="video" value="https://www.youtube.com/watch?v=ia8bhFoqkVE" />
				</label>
				<button id="loadVideo" disabled>Load</button>
			</div>
			<div id="controls">
			    <div id="player-container">
			        <div id="player"></div>
			        <div id="player-controls">
			            <button data-step="-10">-10</button>
			            <button data-step="-1">-1</button>
			            <button data-step="-0.1">-0.1</button>
			            <button data-step="+0.1">+0.1</button>
			            <button data-step="+1">+1</button>
			            <button data-step="+10">+10</button>
			        </div>
			        <ul id="timepoints">
	                <script id="timepoint" type="text/html">
	                	<li class="tp-{{type}}">
	                		<i class="picon delete-pause fa fa-trash-o" title="delete pause"></i>
	                		<div>
	                		    <label>{{timeLabel}}:
	                		    	<input type="number" name="current-time" value="{{time}}"
	                		    		placeholder="Enter time" />
	                		    </label>
	                		</div>
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
	                	</li>
	                </script>
			        </ul>
					<button class="add-pause thr-blue-button">Add A Pause</button>

			    </div>
			</div>
			<button id="aplay" disabled class="thr-blue-button">Play</button>

		</div>

	</div>
	<div id="tab-3" class="tab-content">
		<p>The advanced creator will appear here</p>
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
			<button id="save" type="submit" disabled class="thr-blue-button">Save</button>
		</form>

	<?php endif; ?>
	<script src="<?php echo get_stylesheet_directory_uri(); ?>/js/creator.js" ></script>
</div>